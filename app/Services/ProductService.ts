import Env from '@ioc:Adonis/Core/Env'
import Brand from 'App/Models/Brand'
import CatalogSafeStock from 'App/Models/CatalogSafeStock'
import Category from 'App/Models/Category'
import CategoryProduct from 'App/Models/CategoryProduct'
import OptionOfProducts from 'App/Models/OptionOfProducts'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
import ProductsPacks from 'App/Models/ProductsPacks'
import Variant from 'App/Models/Variant'
import BigcommerceService from 'App/Services/BigcommerceService'
import CategoryService from './CategoryService'
import GeneralService from './GeneralService'
import ProductCacheService from './ProductCacheService'

class ProductService {
  static cacheProductByCategory: string = ''
  static readonly nodeEnv = true //Env.get('NODE_ENV') !== 'development'

  static async getProducts(params, requestUrl) {
    const categories = Number(params.cat_id) === 0 ? 0 : Number(params.cat_id)
    const brand_id = Number(params.brand_id)
    const page = Number(params.page)
    const limit = params.cat_id == 28 || params.cat_id == 4243 ? 650 : 50
    const order = params.order == 'default' ? 'asc' : params.order
    const sort = params.order == 'default' ? 'sort_order' : 'discount_price'

    console.log('Processing request for category:', categories)
    console.log('Is special category:', ProductCacheService.isSpecialCategory(categories))

    // Check if this is a special category that needs cached data
    if (ProductCacheService.isSpecialCategory(categories)) {
      try {
        // First try to get from cache
        const cachedProducts = await ProductCacheService.getCachedProducts(categories)

        if (cachedProducts) {
          console.log('Using cached products for category:', categories)

          // Ordenar los productos del caché según el parámetro order
          let sortedProducts = [...cachedProducts]
          if (sort === 'discount_price') {
            sortedProducts.sort((a, b) => {
              const priceA = a.discount_price || 0
              const priceB = b.discount_price || 0
              return order === 'desc' ? priceB - priceA : priceA - priceB
            })
          }

          // Apply pagination to cached products
          const startIndex = (page - 1) * limit
          const endIndex = startIndex + limit
          const paginatedProducts = sortedProducts.slice(startIndex, endIndex)

          return {
            products: paginatedProducts,
            paginate: {
              total: sortedProducts.length,
              perPage: limit,
              currentPage: page,
              lastPage: Math.ceil(sortedProducts.length / limit),
              data: paginatedProducts
            }
          }
        }

        console.log('No cache found or expired, generating new cache for category:', categories)
        // If no cache or expired, get all products and create cache
        const allProductsQuery = ProductsBigcommerce.query()
          .preload('categories')
          .whereHas('categories', q => q.where('category_id', categories))
          .where('is_visible', true)
          .if(brand_id !== 0, q => q.where('brand_id', brand_id))
          .orderBy('sort_order', 'asc')
          .limit(limit)

        const allProducts = await allProductsQuery.exec()
        console.log('Fetched', allProducts.length, 'products for category:', categories)

        const allFormattedProducts = await this.formatProducts(allProducts)
        console.log('Products formatted, updating cache')

        // Update cache
        await ProductCacheService.updateCache(categories, allFormattedProducts)
        console.log('Cache updated successfully')

        // Return paginated results from the newly cached data
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedProducts = allFormattedProducts.slice(startIndex, endIndex)

        return {
          products: paginatedProducts,
          paginate: {
            total: allFormattedProducts.length,
            perPage: limit,
            currentPage: page,
            lastPage: Math.ceil(allFormattedProducts.length / limit),
            data: paginatedProducts
          }
        }
      } catch (error) {
        console.error('Error handling special category:', categories, error)
        // Fall back to regular query if there's an error
      }
    }

    // Regular query for non-special categories or when cache handling fails
    console.log('Using regular query for category:', categories)
    let query = ProductsBigcommerce.query()
      .preload('categories')
      .whereHas('categories', q => {
        if (categories !== 0) {
          q.where('category_id', categories)
        }
      })
      .where('is_visible', true)
      .if(brand_id !== 0, q => q.where('brand_id', brand_id))

    // Ordenación
    if (sort === 'sort_order') {
      query = query.orderBy('sort_order', order)
    } else {
      query = query.orderBy('discount_price', order)
    }

    // Paginación
    const products = await query.paginate(page, limit)

    // Formateo
    const formattedProducts = await this.formatProducts(products.all())

    // Ordenar por stock si es necesario
    formattedProducts.sort((a, b) => {
      const aHasStock = a.stock !== 0 ? 0 : 1
      const bHasStock = b.stock !== 0 ? 0 : 1
      return aHasStock - bHasStock
    })

    return {
      products: formattedProducts,
      paginate: {
        total: products.total,
        perPage: limit,
        currentPage: page,
        lastPage: products.lastPage,
        data: formattedProducts
      }
    }
  }

  private static async getFreshProducts(limit, sort, order, brand_id, categories, page) {
    const query = ProductsBigcommerce.query()
      .preload('categories')
      .where('is_visible', true)
      .andWhere('stock', '>', 0)
      .whereHas('categories', q => {
        if (categories !== 0) q.where('category_id', categories)
      })
      .if(brand_id !== 0, q => q.where('brand_id', brand_id))

    if (sort === 'sort_order') {
      query.orderBy('sort_order', order)
    } else {
      query.orderBy('discount_price', order)
    }

    const allProducts = await query
    const formattedProducts = await this.formatProducts(allProducts)

    const sortedProducts = formattedProducts.sort((a, b) => {
      const aHasStock = a.stock > 0 ? 0 : 1
      const bHasStock = b.stock > 0 ? 0 : 1
      return aHasStock - bHasStock
    })

    const uniqueProducts = Array.from(new Set(sortedProducts.map(p => p.product_id))).map(id =>
      sortedProducts.find(p => p.product_id === id)
    )

    const offset = (page - 1) * limit
    const paginatedProducts = uniqueProducts.slice(offset, offset + limit)
    const total = uniqueProducts.length

    return {
      products: paginatedProducts,
      paginate: {
        total,
        perPage: limit,
        currentPage: page,
        lastPage: Math.ceil(total / limit),
        data: paginatedProducts
      }
    }
  }

  static async getProductsByCategory(id: string) {
    try {
      // Obtener los registros de category_products relacionados con la categoría 33 y el product_id 39
      const categoryProducts = await CategoryProduct.query().where('category_id', Number(id)).select('product_id')

      // Extraer los IDs de los productos
      const productIDs = categoryProducts.map(cp => cp.product_id)

      // Obtener los productos correspondientes de productsbigcommerce_news
      let products = await ProductsBigcommerce.query()
        .whereIn('product_id', productIDs)
        .where('is_visible', true)
        //.where('stock','>',0)
        // .orderBy('title', 'asc')
        .orderBy('discount_price', 'desc')

      products = await ProductService.formatProducts(products)

      return products
    } catch (error) {
      return { status: 'error', message: error.message }
    }
  }
  static async modifyStock(products) {
    await Promise.all(
      products.map(async function (elem, _index) {
        if (elem?.packs?.length > 0) {
          ProductService.modifyStockPack(elem.packs)
        } else {
          if (elem.variant_id) {
            const productFind = await ProductsBigcommerce.findBy('product_id', elem.variant_id)
            if (productFind) {
              productFind.merge({
                stock: productFind.stock - elem.quantity
              })
              await productFind.save()
            }
          }
        }
      })
    )
  }

  static async modifyStockPack(pack) {
    await Promise.all(
      pack.map(async function (elem, _index) {
        const productFind = await ProductsBigcommerce.findBy('product_id', elem.id)
        if (productFind) {
          productFind.merge({
            stock: elem.stock - elem.quantity
          })
          await productFind.save()
        }
      })
    )

    console.log('pack modificados stock')
  }

  static breadcrumbs(category, categories_ids) {
    if (category) {
      if (category.children) {
        const child = category.children.find(child => categories_ids.includes(child.entityId))
        if (child) {
          const children = child.children.find(children => categories_ids.includes(children.entityId))
          if (!children) {
            category.children = [child]
            return category
          }
          category.children = [children]
          return category
        }
      }
      const { children, ...restCategory } = category
      return { ...restCategory, children: [] }
    }

    return { children: [], msg: 'Breadcrumb not found' }
  }

  static async getFeaturedProducts() {
    try {
      const featuredProducts = await ProductsBigcommerce.query()
        .preload('brand', query => {
          query.select('name') // Selecciona solo el campo 'name' de la tabla 'brands'
        })
        .where('featured', true)
        .andWhere('stock', '>', 0)
        .orderBy('product_id', 'desc')
        .exec()

      const products = await ProductService.formatProducts(featuredProducts)

      return products
    } catch (error) {
      console.error('error al obtener productos destacados: ', error)
    }
  }

  static async getRecommendedProducts() {
    try {
      // Obtener los registros de category_products relacionados con la categoría 33 y el product_id 39
      const categoryProducts = await CategoryProduct.query()
        .where('category_id', Env.get('ID_RECOMMENDED'))
        .select('product_id')

      // Extraer los IDs de los productos
      const productIDs = categoryProducts.map(cp => cp.product_id)

      let products = await ProductsBigcommerce.query().whereIn('product_id', productIDs).andWhere('stock', '>', 0)

      products = await ProductService.formatProducts(products)

      return products
    } catch (error) {
      console.error('Error fetching recommended product:', error)
    }
  }

  static async listProducts(): Promise<any> {
    let arrayProducts
    const products = await BigcommerceService.getProductsByChannel(Env.get('BIGCOMMERCE_CHANNEL_ID'))
    const pages: number = products.meta.pagination.total_pages

    // Aqui almaceno las promesas de solicitud
    const promises: any = []

    // Para obtener detalles de productos
    const getProductsDetails = async productIds => {
      try {
        const products_per_page = await BigcommerceService.getAllProductsRefactoring(productIds)
        return products_per_page.data
      } catch (error) {
        console.error(`Error processing page:`, error)
        return []
      }
    }

    // para  las solicitudes en paralelo
    for (let val = 1; val <= pages; val++) {
      const productsPerChannelPromise = BigcommerceService.getProductsByChannel(
        Env.get('BIGCOMMERCE_CHANNEL_ID'),
        val
      ).then(productsPerChannel => {
        const productIds = productsPerChannel.data.map(product => product.product_id)
        return getProductsDetails(productIds)
      })

      promises.push(productsPerChannelPromise)
    }

    // para combinar los resultados de todas las páginas
    const batchResponses = await Promise.all(promises)
    const combinedProductsData = batchResponses.flat()
    arrayProducts = combinedProductsData.map(product => {
      return [
        {
          link: `${Env.get('URL_SITE_PROD')}/producto${product.custom_url.url}?id=${product.id}`
        }
      ]
    })
    const result = arrayProducts
      .flat(Infinity) // aplano el array para que sea de una sola dimensión
      .map(product => product.link)
    return result
  }

  static async warningStockProducts(id, final_stock, warning_stock) {
    const warningStockList = await BigcommerceService.getAllProductsByCategories(Number(Env.get('STOCK_WARNING_ID')))
    const filter_id = warningStockList.filter(product => product.id == id)

    const result = filter_id.length > 0 ? final_stock - warning_stock : final_stock

    return result
  }

  //NUEVO 👀 👀
  static async formatProducts(products) {
    // Obtener todos los category_id que son hijos de la categoría
    const childTags = await CategoryService.getChildCategories(Env.get('ID_BENEFITS'))
    const childCampaigns = await CategoryService.getChildCategories(Env.get('ID_CAMPAIGNS'))
    // Llamar a la función getTagsByCategory para obtener las tags de cada producto
    const formattedProducts = await Promise.all(
      products.map(async product => {
        const categories = product.categories_array
        let tags = await CategoryService.getCampaignsByCategory(product.product_id, childTags)
        tags = tags.length ? [...new Set(tags)] : []
        let campaigns = await CategoryService.getCampaignsByCategory(product.product_id, childCampaigns)
        campaigns = campaigns.length ? [...new Set(campaigns)] : []
        const percent = GeneralService.calculateDiscount(product.price, product.sale_price) ?? ''
        // Agregar las tags y las campaigns al objeto del producto
        let variants: any = await Variant.query().where('product_id', product.product_id).orderBy('id', 'asc').pojo()
        const options = await OptionOfProducts.query().where('product_id', product.product_id)
        // Verificar si el producto es un pack
        const pack = product?.categories_array.includes(Number(Env.get('ID_PACKS')) as any)
        let packs: any = await ProductsPacks.query().where('pack_id', product.product_id).pojo()
        const isPackOfVariant = pack ? packs.some((variant: any) => variant.is_variant === true) : false

        const brand = await Brand.findBy('brand_id', product.brand_id)
        const stockInCasePack = packs.length ? await ProductService.packsIsAvailableStock(packs) : []

        if (variants.length > 0) {
          variants[0].stock =
            product.type === 'product' && stockInCasePack !== false && packs.length
              ? (stockInCasePack as number)
              : variants[0]?.stock
        }
        // se aplica en caso de packs de variantes
        ;(variants =
          pack && isPackOfVariant
            ? await ProductService.packsVariantIsAvailableStock(variants, product.product_id)
            : variants),
          (packs = packs?.length
            ? packs
                .filter(item_pack => item_pack.is_variant === false)
                .map(item => {
                  return {
                    id: item.product_id,
                    stock: item.stock,
                    quantity: item.quantity
                  }
                })
            : [])
        variants.length
          ? variants.forEach(variant => {
              // Verifica si variant.title existe y no es una cadena vacía
              if (variant.title) {
                variant.title = variant.title
              }
            })
          : []

        return {
          ...product.serialize(),
          page_title: product.title,
          brand: brand ? brand.name : null,
          discount_rate: percent,
          tags: tags, // Agregar las tags al objeto del producto
          campaigns: campaigns, // Agregar las campaigns al objeto del producto
          categories: categories, // Cambiar categories_array a categories
          variants,
          options: options,
          packs: packs && variants.length < 2 ? packs : [],
          stock: variants.length ? Math.max(...variants.map(variant => variant.stock)) : 0
        }
      })
    )

    return formattedProducts
  }
  //Este metodo calcula el stock disponible en un pack simple
  static async packsIsAvailableStock(pack: any = []) {
    if (!pack.length) return false
    const searchPackWithoutStock = pack.filter(pack => pack.stock < pack.quantity || pack.stock == 0)
    let stock = searchPackWithoutStock.length ? 0 : false
    return stock
  }

  //Este metodo es para los packs de variantes...recibe las variantes del pack y el id del pack para buscar los productos reales del pack y asignarle el stock
  static async packsVariantIsAvailableStock(variants: any[] = [], pack_id) {
    try {
      const verifyStockInTableProductPacks = await Promise.all(
        variants.map(async variant => {
          // Obtener información de la variante en ProductsPacks
          const variantInfo = await ProductsPacks.query()
            .where('variant_id', variant.id)
            .where('is_variant', true)
            .where('pack_id', pack_id)

          // Verifica si el stock de cada uno de los productos de la variante tiene un stock mayor a su cantidad ofrecida en el pack
          const isStockAvailable = variantInfo.every(info => info.stock >= info.quantity)

          // Asignar stock a 0 si no cumple la condición, o dejar el valor por defecto
          let variantOriginal = {
            ...variant,
            stock: isStockAvailable ? variant.stock : 0 // Si el stock no es suficiente, se asigna 0
          }
          return variantOriginal
        })
      )

      // variantes ordenadas en forma ascendente por ID
      const sortedVariants = verifyStockInTableProductPacks

      return sortedVariants
    } catch (error) {
      throw error
    }
  }

  static async getProductsinReserve() {
    try {
      const productReserve = await CategoryProduct.query()
        .where('category_id', Env.get('ID_RESERVE'))
        .select('product_id')

      // Extraer los IDs de los productos
      const productIDs = productReserve.map(cp => cp.product_id)

      let products = await ProductsBigcommerce.query().whereIn('product_id', productIDs)

      products = await ProductService.formatProducts(products)

      return products
    } catch (error) {
      console.error('Error fetching reserve product:', error)
    }
  }
  static sortReviewProductByImage(reviews) {
    if (!Array.isArray(reviews.reviews) && !reviews.reviews.length) {
      return reviews
    }
    const reviewSorted = reviews.reviews.sort((a, b) => {
      // Primero, verifica si tienen imágenes
      const aHasImages = a.images_url.length > 0
      const bHasImages = b.images_url.length > 0

      // Si uno tiene imágenes y el otro no, el que tiene imágenes va primero
      if (aHasImages && !bHasImages) {
        return -1
      }
      if (!aHasImages && bHasImages) {
        return 1
      }

      // Si ambos tienen imágenes o ninguno tiene, ordena por fecha
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    return { ...reviews, reviews: reviewSorted }
  }
  // metódo para aber si un producto pertenece a una categoría.
  static async isProductInCategory(product_id, category_id) {
    try {
      const isInCategory = await CategoryProduct.query()
        .where('category_id', category_id)
        .where('product_id', product_id)
        .first()
      return isInCategory !== null
    } catch (error) {
      console.error('Error en isProductInCategory:', error)
      return error.message
    }
  }

  //metodo para productos que pertencen a un pack
  static async getInfoByProductPack(pack_id) {
    try {
      const pack = await ProductsPacks.query().where('pack_id', pack_id).pojo()
      return pack
    } catch (error) {
      console.error('Error fetching product pack Info:', error)
      return { error: error.message }
    }
  }
  static async getInfoByVariant(sku) {
    if (!sku) {
      console.error('SKU no proporcionado')
      return null
    }

    try {
      const variant = await Variant.query().where('sku', sku).first()
      if (variant === null) {
        throw new Error('Error fetching variant Info')
      }

      const product = await ProductsBigcommerce.query()
        .where('product_id', variant.product_id)
        .select('reserve', 'categories_array')
        .first()
      if (product === null) {
        throw new Error('Error fetching product Info')
      }

      const serialContainer = this.getBinPickingNumber(sku)
      const bin_picking_number = Object.keys(serialContainer).length > 0 ? serialContainer : null
      const isPack = product.categories_array.includes(Number(Env.get('ID_PACKS')) as any)
      const isReserve = product.categories_array.includes(Number(Env.get('ID_RESERVE')) as any)
      let pack: any = await this.getInfoByProductPack(variant.product_id)
      if (pack.error) {
        pack = []
      }
      const isPackVariant = pack.every(item => item.is_variant)
      if (isPackVariant) {
        pack = pack.filter(item => item.variant_id === variant.id)
      }

      return { ...variant.serialize(), ...product.serialize(), bin_picking_number, isPack, isReserve, pack: pack }
    } catch (error) {
      console.error('Error en getInfoByVariant:', error)
      return { error: error.message }
    }
  }
  static async getBinPickingNumber(sku) {
    try {
      const inventory = await CatalogSafeStock.query().where('sku', sku).select('bin_picking_number').first()
      return inventory
    } catch (error) {
      console.error('Error en getInfoByVariant:', error)
      return { error: error.message }
    }
  }
  static async getRelatedProducts(id: number) {
    try {
      const product = await Variant.findBy('product_id', id)
      if (!product) {
        throw new Error('Producto no encontrado')
      }

      const usesDefaultRelatedProducts = product?.related_products?.includes(-1) ?? false

      return usesDefaultRelatedProducts
        ? await this.getDefaultRelatedProducts(id)
        : await this.getCustomRelatedProducts(product.related_products as number[])
    } catch (error) {
      console.error('Error al obtener productos relacionados:', error)
      throw error // Considera lanzar un error personalizado aquí
    }
  }

  private static async getCustomRelatedProducts(productIds: number[]) {
    if (!productIds?.length) return []

    try {
      console.log(productIds)
      const products = await ProductsBigcommerce.query().whereIn('product_id', productIds)

      return this.formatProducts(products)
    } catch (error) {
      console.error('Error al obtener productos relacionados personalizados:', error)
      throw new Error('No se pudieron cargar los productos relacionados')
    }
  }

  private static async getDefaultRelatedProducts(productId: number) {
    try {
      const mainCategory = await this.getMainProductCategory(productId)

      if (!mainCategory?.length) {
        return []
      }

      // Tomamos la primera categoría visible como principal
      const mainCategoryId = mainCategory[0].category_id
      return await this.getProductsByCategories(mainCategoryId, productId)
    } catch (error) {
      console.error('Error al obtener productos relacionados por defecto:', error)
      throw new Error('No se pudieron cargar los productos sugeridos')
    }
  }

  private static async getProductsByCategories(categoryId: number, excludeProductId?: number) {
    try {
      console.log(categoryId)
      const query = CategoryProduct.query()
        .whereIn('category_id', [categoryId])
        .preload('product', query => {
          query.where('is_visible', true)
          query.select('*')
        })

      if (excludeProductId) {
        query.whereNot('product_id', excludeProductId)
      }

      let products = await query.limit(12)
      let productsArray = products
        .map(productWithCategory => {
          return productWithCategory.product
        })
        .filter(product => product !== null)

      return this.formatProducts(productsArray)
    } catch (error) {
      console.error('Error al obtener productos por categoría:', error)
      throw new Error('No se pudieron cargar productos de la categoría')
    }
  }
  private static async getMainProductCategory(productId: number) {
    try {
      const productCategories = await CategoryProduct.query().where('product_id', productId).select('category_id')

      if (!productCategories.length) {
        return []
      }

      const categoryIds = productCategories.map(item => item.category_id)
      return await Category.query().whereIn('category_id', categoryIds).where('is_visible', true)
    } catch (error) {
      console.error('Error al obtener categorías del producto:', error)
      throw new Error('No se pudieron cargar las categorías del producto')
    }
  }
}
export default ProductService
