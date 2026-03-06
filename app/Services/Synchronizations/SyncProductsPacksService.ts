import Database from '@ioc:Adonis/Lucid/Database'
import CatalogSafeStock from 'App/Models/CatalogSafeStock'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
import ProductsPacks from 'App/Models/ProductsPacks'
import BigcommerceService from '../BigcommerceService'

export default class SyncProductsPacksService {
  public async syncPacksFromBigcommerce() {
    try {
      // metodo para obtener todos los packs de bigcommerce
      let productsPacks = await BigcommerceService.getAllProductsPacks()
      // metodo para buscar los metafields en los packs de variantes
      let allPacksWithVariants = await this.getVariantsOfPacks(productsPacks) // obtener variantes de cada pack
      //metodo para dar el formato que necesito para diferenciar entre packs simples y de variantes
      let prepareDataPacks = await this.prepareDataPacks(allPacksWithVariants)
      // return prepareDataPacks
      // filtrar productos de la categoría packs que tengan item_packs para quitar los que no
      let filterPacksWithProducts = await prepareDataPacks.filter(pack => pack?.items_packs?.length > 0)
      // metodo para obtener el formato de todos los productos que forman parte de un pack simple y de variantes
      let createFormatForDatabase = await this.formatProductsPacks(filterPacksWithProducts)
      if (createFormatForDatabase) {
        // guardamos lo packs en la db
        return await this.saveProductsOfPacksInDatabase(createFormatForDatabase)
      }
    } catch (error) {
      throw error
    } finally {
      try {
        const packIds = await this.getPackIdsWithZeroStock()
        if (packIds.length > 0) {
          await this.updateProductsVisibility(packIds)
        }
      } catch (error) {
        console.error('Hubo un error en el proceso de obtener los packs sin stock: ', error)
      }
    }
  }
  // formatear el listado en la estructura de la DB
  private async formatProductsPacks(packs: any[] = []): Promise<any[]> {
    // Validar si el array packs está vacío
    if (!packs.length) {
      return []
    }

    // array para almacenar todos los productos de los packs
    const formattedPacks: any[] = []

    for (const pack of packs) {
      const pack_id = pack.id

      for (const item of pack.items_packs) {
        let stockSecurity: number = 0
        let inventoryProduct
        try {
          // Obtener producto del inventario
          inventoryProduct = await CatalogSafeStock.findBy('sku', item.product.trim()) // item.product es el sku del producto
          stockSecurity = inventoryProduct?.safety_stock || 0
        } catch (error) {
          console.error(`Error obteniendo stock para SKU ${item.product}:`, error.message)
          // saltar al siguiente item
          continue
        }

        // Verificar si alguno de los valores es nulo
        if (!inventoryProduct?.product_id || !inventoryProduct?.sku) {
          console.error(`Producto con SKU ${item.product} tiene valores nulos. Se omite.`)
          continue
        }

        // Crear el objeto de producto en el pack y agregarlo al array
        formattedPacks.push({
          pack_id,
          product_id: inventoryProduct?.product_id,
          sku: inventoryProduct?.sku.trim(),
          stock:
            item.quantity <= inventoryProduct?.available_to_sell && stockSecurity < inventoryProduct?.available_to_sell
              ? inventoryProduct.available_to_sell
              : 0,
          quantity: item?.quantity || null,
          is_variant: item?.is_variant || false,
          variant_id: item?.variant_id || 0
        })
      }
    }

    return formattedPacks
  }
  //metodo para guardar el listado de packs en la base de datos
  private async saveProductsOfPacksInDatabase(packs: any[] = []) {
    const trx = await Database.transaction()

    const listpacks = packs

    try {
      // Eliminar todos los registros existentes en la tabla 'products_packs'
      await ProductsPacks.query().useTransaction(trx).delete()
      // Crear nuevos registros en la tabla 'products_packs' con los datos proporcionados
      await ProductsPacks.createMany(listpacks, trx)

      // Confirmar la transacción
      await trx.commit()
      const totalPacks = await ProductsPacks.all()
      return { status: 201, data: totalPacks }
    } catch (error) {
      // Revertir la transacción en caso de error
      await trx.rollback()
      return {
        status: 'Error',
        success: false,
        message: 'Ocurrió un error al sincronizar los datos de packs.',
        type: error.stack,
        detail: error.detail
      }
    }
  }

  /* este metodo se usa para preparar la estructura de los packs y diferenciar entre packs simples y de variantes, se agregaron dos campos en cada dato del pack para diferenciar entre pack simples y de variantes estos se llaman "item_pack_simple","item_pack_variants"  que devuelven un valor booleano, además el campo item_packs contiene los productos de ambos tipos de packs */
  public async prepareDataPacks(packList: any[]) {
    try {
      let packs = await Promise.all(
        packList.map(async item => {
          const isPackOfVariants = item?.variants && item.variants.length > 1 ? true : false
          const isPacksSimple = item?.items_packs && item.items_packs.length > 0 ? true : false

          // Inicializa el array `items_packs` si no está definido como es el caso de los packsde variantes
          item.items_packs = item.items_packs || []

          if (isPackOfVariants) {
            const variants = await Promise.all(
              item.variants.map(async variantPack => {
                const variant_id = variantPack.id
                const royalProduct = await BigcommerceService.getMetafieldsByPacksVariants([
                  { id: variantPack.id, product_id: variantPack.product_id }
                ])

                const formattedMetafieldsVariantsPacks = royalProduct
                  ?.flat()
                  ?.filter(variant => variant.key === 'packs')
                  ?.map(variant => {
                    let metafields = variant?.value ? JSON.parse(variant?.value) : []
                    if (metafields.length) {
                      metafields = metafields.map(item => ({
                        ...item,
                        variant_id,
                        is_variant: true
                      }))
                    }
                    // console.log(metafields)
                    return metafields
                  })
                  ?.flat()

                return formattedMetafieldsVariantsPacks
              })
            )

            // para asegurar de que `variants` no sea `undefined` antes de hacer el push
            if (variants && variants.length > 0) {
              item.items_packs.push(...variants)
            }
          }
          item.item_pack_simple = isPacksSimple
          item.item_pack_variants = isPackOfVariants
          return item // Devuelve siempre el valor del pack
        })
      )

      /* Itera sobre cada pack para actualizar `items_packs` de cada uno para que los packs de variantes tengan siempre el valor is variant en true y la el id de la variante del pack en el campo variant_id */
      packs = packs.map(pack => {
        if (pack.items_packs && pack.items_packs.length > 0) {
          const updatedItemsPacks = pack.items_packs.map(variantGroup => {
            // Asegúrate de que `variantGroup` sea un array
            if (Array.isArray(variantGroup)) {
              const variantWithId = variantGroup.find(variant => variant.is_variant === true)
              const variant_id = variantWithId ? variantWithId.variant_id : null

              // Actualiza cada variante para tener `is_variant: true` y el mismo `variant_id`
              return variantGroup.map(variant => ({
                ...variant,
                is_variant: true,
                variant_id
              }))
            }
            return variantGroup // Si no es un array, lo devuelve sin cambios
          })

          pack.items_packs = updatedItemsPacks.flat()
        }
        return pack // Devuelve el pack con `items_packs` actualizado
      })

      return packs
    } catch (error) {
      console.error('Error en preparando los packs de variantes:', error)
      throw error
    }
  }

  // este metodo obtiene las variantes de todos los packs, recibe  el array con todo los packs
  public async getVariantsOfPacks(packList: any[]) {
    try {
      const getVariantsByPack = await Promise.all(
        packList.map(async pack => {
          const variant = await BigcommerceService.getVariantsOfProduct(pack.id)
          pack.variants = variant
          return pack
        })
      )

      return getVariantsByPack
    } catch (error) {
      throw error
    }
  }
  // Para obtener los packs con stock cero
  public async getPackIdsWithZeroStock() {
    const packs = await ProductsPacks.query().select('pack_id').where('stock', 0).andWhere('is_variant', false)

    return packs.map(pack => pack.pack_id)
  }
  // Para cambiar la visibilidad de los packs con cero stock
  public async updateProductsVisibility(packIds: number[]) {
    await ProductsBigcommerce.query().whereIn('product_id', packIds).update({ is_visible: false })
  }
}
