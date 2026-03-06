import BigcommerceService from '../BigcommerceService'
import Env from '@ioc:Adonis/Core/Env'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
import Variants from 'App/Models/Variant'
import CategoryProduct from 'App/Models/CategoryProduct'
import CatalogSafeStock from 'App/Models/CatalogSafeStock'
import ProductsPacks from 'App/Models/ProductsPacks'
import moment from 'moment'
import Category from 'App/Models/Category'
//import SyncProductService from './SyncProductService'

export default class SyncPackReserveService {
  // constructor(private readonly SyncProduct = new SyncProductService()) {}
  // este metodo es el principal, porque llama a todos los metodos que involucran el la sincornización de packs con reserva
  public async syncPacksReserve() {
    try {
      let getProductsWithIdPack = await this.searchPacks()
      const getDataOfTableProductPacks = await this.searchProductsOfPacks(getProductsWithIdPack)
      const getProductsOfPacks = await this.searchItemsPack(getDataOfTableProductPacks)
      const formatedPacks = await this.transformDataPack(getProductsOfPacks)
      const packFormated = this.getPackFormated([...formatedPacks])

      const infoPackForInventory = await this.prepareDataForInventory(packFormated)
      const packs = formatedPacks.map(item => {
        const { bin_picking_number, ...pack } = item.packFormated
        return {
          ...item,
          packFormated: pack
        }
      })

      const promises = [
        BigcommerceService.updatePacksWithReserve(packs),
        this.updatePackInDatabase(packs),
        this.updateInventoryLocationPack(infoPackForInventory)
      ]

      const results = await Promise.allSettled(promises)

      const [sendPackforUpdate, updatePackInDatabase, updateInventoryLocationPack] = results.map(result =>
        result.status === 'fulfilled' ? result.value : null
      )

      // Actualizar los productos en la base de datos
      //await this.SyncProduct.syncProductsFromBigcommerce()
      // datos enviados a bigcommerce / actualizacion en la base de datos / actualizacion del inventario correspondiente en bigcommerce
      return [sendPackforUpdate, updatePackInDatabase, updateInventoryLocationPack]
    } catch (error) {
      throw error
    }
  }
  // este metodo se trae todos los productos en la categoria PACK
  public async searchPacks() {
    try {
      const ID_PACKS = Env.get('ID_PACKS')
      let categoryProducts = await CategoryProduct.query()
        .whereIn('category_id', [ID_PACKS])
        .preload('product', query => {
          query.select('product_id', 'title', 'categories_array', 'reserve')
        })

      if (categoryProducts.length > 0) {
        // productos que pertenecen a reserva
        const productsReserve = categoryProducts.map(item => item.product)
        const productsWithContainerAndVariants = await Promise.all(
          productsReserve.map(async product => {
            // 2. Buscar en CatalogsafeStock usando los IDs de productos
            const inventoryProduct = await CatalogSafeStock.query()
              .where('product_id', product.product_id)
              .select('bin_picking_number')
            // 3. Buscar en variants usando los IDs de productos
            const variantsProduct = await Variants.query()
              .where('product_id', product.product_id)
              .select('id', 'product_id', 'sku', 'normal_price', 'discount_price', 'title')
            return {
              ...product.serialize(),
              contenedor: inventoryProduct[0]?.bin_picking_number,
              variants: [...variantsProduct]
            }
          })
        )
        return productsWithContainerAndVariants
      } else {
        return []
      }
    } catch (error) {
      throw error
    }
  }

  // este metodo recibe el resultado del metodo searchPacks para buscar en la tabla ProductsPacks todos los datos realcionado a cada pack
  public async searchProductsOfPacks(products) {
    try {
      if (products.length < 1 || products == undefined) {
        return []
      }
      const getDataPack = await Promise.all(
        products.map(async product => {
          const productsPacks = await ProductsPacks.query().where('pack_id', product.product_id).select('*')

          return {
            ...product,
            pack: productsPacks.flat()
          }
        })
      )

      const filterOnlyPacksWithData = getDataPack.filter(product => product.pack.length)
      return filterOnlyPacksWithData
    } catch (error) {
      throw error
    }
  }
  // este metodo se encarga de buscar los hijos de cada pack con su producto principal, variantes y se apoya de la tabla del inventario para obtener el contenedor
  public async searchItemsPack(products) {
    try {
      const pack = await Promise.all(
        products.map(async product => {
          const searchPackPromises = product.pack
            .map(async pack => {
              const variant = await Variants.query()
                .where('sku', pack.sku)
                .select('id', 'sku', 'product_id', 'title', 'discount_price', 'normal_price', 'stock', 'weight')
              const contenedor = await CatalogSafeStock.query().where('sku', pack.sku).select('bin_picking_number')

              if (!variant || !variant[0]) {
                console.log(`No hay variante por sku ${pack.sku}`)
                return null
              }

              const productPrincipal = await ProductsBigcommerce.query()
                .where('product_id', variant[0]?.product_id)
                .select('product_id', 'title', 'stock', 'weight', 'reserve', 'categories_array', 'discount_price')
              return {
                ...productPrincipal[0].serialize(),
                variants: variant[0].serialize(),
                ...contenedor[0].serialize()
              }
            })
            .flat()

          const searchPackResults = await Promise.all(searchPackPromises)

          return {
            ...product,
            data_pack: searchPackResults.flat().filter(item => item !== null)
          }
        })
      )
      return pack
    } catch (error) {
      throw error
    }
  }

  public async transformDataPack(data) {
    try {
      return await Promise.all(
        data.map(async item => {
          // Determina si el producto está en la categoría de reservas.
          const reserveCategoryId = Number(Env.get('ID_RESERVE'))
          const isReserve = item?.data_pack?.some(product => product?.categories_array.includes(reserveCategoryId))

          let categoryChildReserve
          let newestReserve

          if (isReserve) {
            // Filtra los productos de reserva dentro del paquete.
            const reserves = this.getReserveProducts(item.data_pack, reserveCategoryId)
            console.log(reserves)
            if (reserves.length > 0) {
              // Obtiene la reserva más reciente según la fecha.
              newestReserve = this.getNewestReserve(reserves)
              //console.log(newestReserve)
              // Busca el ID de la categoría secundaria basándose en el título de la reserva.
              categoryChildReserve = await this.getCategoryChildReserve(newestReserve.reserve)
            }
          }

          // Formatea los datos del pack.
          item.packFormated = this.formatPackData(
            item,
            isReserve,
            newestReserve,
            categoryChildReserve,
            reserveCategoryId
          )

          return item
        })
      )
    } catch (error) {
      throw error
    }
  }

  /**
   * Filtra los productos que están en la categoría de reservas.
   */
  private getReserveProducts(dataPack, reserveCategoryId) {
    return dataPack.filter(product => product.categories_array.includes(reserveCategoryId))
  }

  /**
   * Obtiene la reserva más reciente basándose en la fecha.
   */
  private getNewestReserve(reserves) {
    return reserves.reduce((acc, current) => {
      const currentDate = moment(current.reserve, 'D MMMM')
      const accDate = moment(acc.reserve, 'D MMMM')
      return currentDate.isAfter(accDate) ? current : acc
    }, reserves[0])
  }

  /**
   * Busca la categoría secundaria basándose en el título de la reserva.
   */
  private async getCategoryChildReserve(reserveTitle) {
    const category = await Category.query().where('title', reserveTitle).first()
    return category?.category_id || undefined
  }

  /**
   * Formatea los datos del pack para incluir información relevante.
   */
  private formatPackData(item, isReserve, newestReserve, categoryChildReserve, reserveCategoryId) {
    return {
      id: item.product_id,
      name: item.title,
      //  price: item.discount_price,
      weight: item.weight,
      categories: this.formatCategories(
        item.categories_array,
        isReserve,
        newestReserve,
        categoryChildReserve,
        reserveCategoryId
      ),
      bin_picking_number: isReserve && newestReserve ? newestReserve.bin_picking_number : '',
      availability_description: isReserve && newestReserve ? newestReserve.reserve : '',
      date_last_imported: new Date().toISOString().split('.')[0] + '+00:00'
    }
  }

  /**
   * Formatea el nombre del producto dependiendo de si es reserva o no.
   */
  private formatProductName(title, isReserve) {
    if (isReserve) {
      return title.startsWith('Reserva - ') ? title.replace('Reserva - ', '') : title
    }
    return title.startsWith('Reserva - ') ? title.replace('Reserva - ', '') : title
  }

  /**
   * Formatea las categorías del producto basándose en las condiciones de reserva.
   */
  private formatCategories(categoriesArray, isReserve, newestReserve, categoryChildReserve, reserveCategoryId) {
    if (isReserve && newestReserve.categories_array.includes(reserveCategoryId)) {
      return categoriesArray.includes(reserveCategoryId)
        ? categoriesArray.filter(item => item !== null && typeof item !== 'string')
        : categoriesArray
            .concat(reserveCategoryId, categoryChildReserve)
            .filter(item => item !== null && typeof item !== 'string')
    }
    return categoriesArray.includes(reserveCategoryId)
      ? categoriesArray
          .filter(id => id !== reserveCategoryId)
          .filter(id => id !== categoryChildReserve)
          .filter(item => item !== null)
      : categoriesArray.filter(item => item !== null && typeof item !== 'string')
  }
  // este metodo es para actualizar en la base de datos los packs que han pasado a reserva y los que ya no pertenecen a reserva
  private async updatePackInDatabase(listProductPacks: any[]) {
    try {
      const updatedIds: number[] = []
      const failedIds: number[] = []
      const packsFormated = listProductPacks.map(item => item.packFormated)
      const updatePromises = packsFormated.map(async pack => {
        const product = await ProductsBigcommerce.query().where('product_id', pack.id).first()

        if (product) {
          product.merge({
            categories_array: JSON.stringify(pack.categories) as unknown as string[],
            title: pack.name,
            reserve: pack.availability_description
          })

          await product.save()
          updatedIds.push(pack.id)
          // console.log(`Producto con ID ${pack.id} actualizado en la base de datos.`);
        } else {
          failedIds.push(pack.id)
          // console.log(`No se encontró ningún producto con ID ${pack.id} en la base de datos.`);
        }
      })

      await Promise.all(updatePromises)

      return {
        status: 201,
        updateds: updatedIds.length,
        faileds: failedIds.length,
        'List Pack success': updatedIds.join('-'),
        'List Pack faileds': failedIds.join('-')
      }
    } catch (error) {
      console.error('Error al actualizar la base de datos:', error)
      return {
        status: 500,
        message: 'Error al actualizar la base de datos',
        error: error
      }
    }
  }
  private async updateInventoryLocationPack(products) {
    try {
      const updateInfoInventoryPack = await BigcommerceService.updateProductInventoryLocation(products)
      return updateInfoInventoryPack
    } catch (error) {
      console.log('Error al actualizar el inventario en la sincronización de packs con reserva:', error)
      throw error
    }
  }
  private getPackFormated(products) {
    return products.map(product => product.packFormated).flat()
  }
  private async prepareDataForInventory(products) {
    try {
      const formatedData = await Promise.all(
        products.map(async product => {
          // Obtener los SKUs para el producto pack
          const getSkuPackByVariant = await Variants.query().where('product_id', product.id).select('sku', 'product_id')

          const getSkuPack = getSkuPackByVariant.map(item => item.sku)

          // Obtener información de inventario para cada SKU del pack
          const infoInventoryPack = await Promise.all(
            getSkuPack.map(async sku => {
              const inventoryInfo = await CatalogSafeStock.query().where('sku', sku)
              return inventoryInfo || []
            })
          )

          // Aplanar los resultados de infoInventoryPack
          const flattenedInventoryInfo = infoInventoryPack.flat()

          // Formatear la información para el inventario
          const infoPackForInventory = flattenedInventoryInfo.map(item => {
            return {
              settings: [
                {
                  identity: {
                    sku: item.sku
                  },
                  safety_stock: item.safety_stock,
                  is_in_stock: true,
                  warning_level: item.warning_level,
                  bin_picking_number: product && product.bin_picking_number ? product.bin_picking_number : ' '
                }
              ]
            }
          })

          return infoPackForInventory
        })
      )

      return formatedData.flat()
    } catch (error) {
      console.log('Error al actualizar el inventario en la sincronización de packs con reserva:', error)
      throw error
    }
  }
}
