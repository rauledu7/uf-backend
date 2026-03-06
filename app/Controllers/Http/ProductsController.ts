import Env from '@ioc:Adonis/Core/Env'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import WaitList from 'App/Models/WaitList'
import BigcommerceService from 'App/Services/BigcommerceService'
import GeneralService from 'App/Services/GeneralService'
// import * as prismic from '@prismicio/client'
// import fetch from 'node-fetch'
import ProdutStockAlert from 'App/Mailers/ProductStockAlert'
import WaitingList from 'App/Mailers/WaitingList'
import Brand from 'App/Models/Brand'
import CatalogSafeStock from 'App/Models/CatalogSafeStock'
import OptionOfProducts from 'App/Models/OptionOfProducts'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
import ProductsPacks from 'App/Models/ProductsPacks'
import StockSecurities from 'App/Models/StockSecurity'
import Variant from 'App/Models/Variant'
import BsaleService from 'App/Services/BsaleService'
import CategoryService from 'App/Services/CategoryService'
import GoogleService from 'App/Services/GoogleService'
import PrismicService from 'App/Services/PrismicService'
import ProductService from 'App/Services/ProductService'
import ReportReserveService from 'App/Services/ReportReserve/ReportReserveService'

export default class ProductsController {
  public async index({ params, request }: HttpContextContract) {
    let requestUrl = request.url()
    const query = request.all()
    if (query?.update) {
      requestUrl = Object.assign(requestUrl, query)
      console.log(requestUrl)
    }
    let products = await ProductService.getProducts(params, requestUrl)
    const productsArray = {
      products: products.products,
      max_pages: products.paginate.lastPage
    }

    return productsArray
  }

  public async filters({ params }: HttpContextContract) {
    const products = await ProductService.getProductsByCategory(params.cat_id)
    //let products = await BigcommerceService.getProductsByFilter(params)
    // let information_box = await BigcommerceService.getMetafieldsByCategory(params.cat_id, 'information_box') ?? []
    // if (information_box.length > 0) {
    //     information_box = JSON.parse(information_box)
    // }

    const productsArray = { products }

    return productsArray
  }

  public async outOfStock({ params }: HttpContextContract) {
    let products = await BigcommerceService.getProductsByFiltersOutOfStock(params)
    // let information_box = await BigcommerceService.getMetafieldsByCategory(params.cat_id, 'information_box') ?? []
    // if (information_box.length > 0) {
    //     information_box = JSON.parse(information_box)
    // }

    const productsArray = { products: products.products, max_pages: products.max_pages }

    return productsArray
  }

  public async productsLinks({ response }: HttpContextContract) {
    try {
      const products = await ProductService.listProducts()
      response.status(200).json(products)
    } catch (error) {
      console.log(`Error: ${error.message}`)
      response.status(404).json({ error: error.message })
    }
  }

  public async merchantCenter({}: HttpContextContract) {
    const googleService = new GoogleService()
    await googleService.authGoogleMerchantCenter()
    let data = await googleService.createProduct()

    return data
  }

  public async show({ params }: HttpContextContract) {
    try {
      const id = params.id
      // Obtener configuración global y producto en paralelo
      const [document, product] = await Promise.all([
        (async () => {
          // const endpoint = prismic.getRepositoryEndpoint(Env.get('ENDPOINT_PRISMIC'))
          // const client = prismic.createClient(endpoint, {
          //   accessToken: Env.get('PRISMIC_ACCESS_TOKEN'),
          //   fetch,
          // })
          return await PrismicService.getDocument(Env.get('ENDPOINT_PRISMIC'), 'configuraciones_globales')
          // return await PrismicService.client.getSingle('configuraciones_globales')
        })(),
        ProductsBigcommerce.findBy('product_id', id)
      ])

      if (!product) {
        return { status: 'error', message: 'Producto no encontrado' }
      }

      // Ejecuta operaciones asíncronas en paralelo
      let [
        categories,
        landing,
        icons,
        specs,
        image,
        faqs,
        productVideo,
        title_carousel,
        products_icons,
        interactive_banner_desktop,
        interactive_banner_mobile,
        skills_interactive_banner_desktop,
        skills_interactive_banner_mobile,
        banner_video,
        carousel_images,
        image_specs,
        products_features,
        keyfields,
        gallery_performance,
        new_icons,
        getButtonsPdp
      ]: any = await Promise.all([
        BigcommerceService.categoryThree(),
        GeneralService.getLandingByProduct(id),
        GeneralService.getIconsByCategory(product.categories_array),
        BigcommerceService.getSpecsList(id, product.images),
        BigcommerceService.getMetafieldsByCategory(product.categories_array[0], 'reviews_image'),
        GeneralService.getFaqsByProduct(id),
        BigcommerceService.getMetafieldsByProduct(id, 'product_video'),
        BigcommerceService.getMetafieldsByProduct(id, 'title_carousel'),
        BigcommerceService.getMetafieldsByProduct(id, 'product_icons'),
        BigcommerceService.getMetafieldsByProduct(id, 'interactive_banner_desktop'),
        BigcommerceService.getMetafieldsByProduct(id, 'interactive_banner_mobile'),
        BigcommerceService.getMetafieldsByProduct(id, 'skills_interactive_banner_desktop'),
        BigcommerceService.getMetafieldsByProduct(id, 'skills_interactive_banner_mobile'),
        BigcommerceService.getMetafieldsByProduct(id, 'youtube_video'),
        BigcommerceService.getMetafieldsByProduct(id, 'images_carrousel_uf'),
        BigcommerceService.getMetafieldsByProduct(id, 'image_specs'),
        BigcommerceService.getMetafieldsByProduct(id, 'icons_terraforce'),
        BigcommerceService.getMetafieldsByProduct(id, 'keyfields_uf'),
        BigcommerceService.getMetafieldsByProduct(id, 'gallery_performance'),
        BigcommerceService.getMetafieldsByProduct(id, 'new_icons'),
        GeneralService.getButtonsPdp(document.data)
      ])

      //CASTEANDO A JSON LOS METAFIELDS SI ES QUE VIENEN CON DATOS
      const banner_desktop =
        interactive_banner_desktop.length > 0 ? JSON.parse(interactive_banner_desktop) : interactive_banner_desktop
      const banner_mobile =
        interactive_banner_mobile.length > 0 ? JSON.parse(interactive_banner_mobile) : interactive_banner_mobile

      const interactive_banner = {
        desktop: {
          description: banner_desktop?.description,
          image: banner_desktop?.image,
          skills:
            skills_interactive_banner_desktop.length > 0
              ? JSON.parse(skills_interactive_banner_desktop)
              : skills_interactive_banner_desktop
        },
        mobile: {
          description: banner_mobile?.description,
          image: banner_mobile?.image,
          skills:
            skills_interactive_banner_mobile.length > 0
              ? JSON.parse(skills_interactive_banner_mobile)
              : skills_interactive_banner_mobile
        }
      }

      image_specs = image_specs.length !== 0 ? JSON.parse(image_specs)[0] : { banner_mobile: false, banner: false }
      Object.assign(specs, image_specs)

      const contentSpec = specs.data.map(spec => {
        return `${spec.name}: ${spec.value}`
      })
      const specBody = [
        {
          title: 'Especificaciones Técnicas',
          content: contentSpec,
          icon: ''
        }
      ]
      const [pdp] = getButtonsPdp.filter(e => e.label === 'Tiempos de entrega')
      const buttons_pdp = [
        {
          title: pdp.label,
          content: pdp.description,
          icon: pdp.icon
        }
      ]
      const warranty = [
        {
          title: 'Certificaciones y Garantia',
          content: await BigcommerceService.getMetafieldsByProduct(id, 'product_warranty'),
          icon: ''
        }
      ]
      const dropdown = [...specBody, ...buttons_pdp, ...warranty]
      console.log('dropdown', carousel_images)
      carousel_images =
        carousel_images.length === 0
          ? []
          : JSON.parse(carousel_images)?.map((item, index) => ({
              id: index + 1,
              image: item.image,
              title: item.title,
              description: item.description
            }))
      products_features =
        products_features.length === 0
          ? []
          : JSON.parse(products_features)?.map((item, index) => ({
              id: index + 1,
              image: item.image,
              title: item.title,
              description: item.text
            }))

      const category_id = product.categories_array.find(cat_id => categories[cat_id])

      keyfields = keyfields.length > 0 ? JSON.parse(keyfields) : []
      gallery_performance = gallery_performance.length > 0 ? JSON.parse(gallery_performance) : []
      new_icons = new_icons.length > 0 ? JSON.parse(new_icons) : []

      let arrayProduct = {
        features: landing,
        icons,
        specs,
        image_review: image,
        faqs,
        weight: product.weight,
        sameday: product.sameday,
        turbo: product?.turbo || false,
        despacho24horas: product.despacho24horas,
        free_shipping: product.free_shipping,
        pickup_in_store: product.pickup_in_store,
        breadcrumb: category_id ? ProductService.breadcrumbs(categories[category_id], product.categories_array) : [],
        page_title: product.page_title,
        meta_description: product.meta_description,
        meta_keywords: product.meta_keywords,
        sizes: product.sizes,
        video: { url: productVideo },
        carousel_images: { title: title_carousel, carousel_images },
        products_features,
        products_icons,
        interactive_banner: interactive_banner_desktop.length > 0 ? interactive_banner : [],
        id_video: banner_video.length > 0 ? banner_video : '',
        dropdown,
        keyfields,
        gallery_performance,
        new_icons
      }

      return arrayProduct
    } catch (error) {
      return { status: 'error', message: error.message, stack: error.stack }
    }
  }

  public async showPrincipal({ params }: HttpContextContract) {
    try {
      const id = params.id
      let accordeon: any = []
      // Obtener configuración global y producto en paralelo
      const [document, product] = await Promise.all([
        (async () => {
          // const endpoint = prismic.getRepositoryEndpoint(Env.get('ENDPOINT_PRISMIC'))
          // const client = prismic.createClient(endpoint, {
          //   accessToken: Env.get('PRISMIC_ACCESS_TOKEN'),
          //   fetch,
          // })
          return await PrismicService.getDocument(Env.get('ENDPOINT_PRISMIC'), 'configuraciones_globales')
        })(),
        ProductsBigcommerce.findBy('product_id', id)
      ])

      if (!product) {
        return { status: 'error', message: 'Producto no encontrado' }
      }
      // Verificar si el producto es un pack
      const pack = product?.categories_array.includes(Number(Env.get('ID_PACKS')) as any)
      // Ejecuta operaciones asíncronas en paralelo
      let [
        brand,
        childTags,
        childCampaigns,
        buttons_pdp,
        warranty,
        variants,
        options,
        products_pack,
        materials,
        details_product,
        image_sizes
      ]: any = await Promise.all([
        Brand.findBy('brand_id', product.brand_id),
        CategoryService.getChildCategories(Env.get('ID_BENEFITS')),
        CategoryService.getChildCategories(Env.get('ID_CAMPAIGNS')),
        GeneralService.getButtonsPdp(document.data),
        BigcommerceService.getMetafieldsByProduct(id, 'product_warranty'),
        Variant.query().where('product_id', id).orderBy('id', 'asc').pojo(),
        OptionOfProducts.query().where('product_id', id),
        pack ? ProductsPacks.query().where('pack_id', id).pojo() : undefined,
        BigcommerceService.getMetafieldsByProduct(id, 'materials'),
        BigcommerceService.getMetafieldsByProduct(id, 'details_product'),
        BigcommerceService.getMetafieldsByProduct(id, 'image_sizes')
      ])
      let [tags, campaigns, stock_pack, isPackOfVariant] = await Promise.all([
        CategoryService.getCampaignsByCategory(id, childTags),
        CategoryService.getCampaignsByCategory(id, childCampaigns),
        ProductService.packsIsAvailableStock(products_pack),
        pack ? products_pack.some((variant: any) => variant.is_variant === true) : false
      ])

      variants[0].stock =
        product.type === 'product' && stock_pack !== false && pack === true ? stock_pack : variants[0].stock

      if (materials && typeof materials === 'string' && materials.trim().length > 0) {
        materials = JSON.parse(materials)
        materials = { label: materials.title, description: materials.description }
        accordeon.push(materials)
      }
      if (details_product && typeof details_product === 'string' && details_product.trim().length > 0) {
        details_product = JSON.parse(details_product)
        details_product = { label: details_product.title, description: details_product.description }
        accordeon.push(details_product)
      }

      products_pack =
        pack && !isPackOfVariant && products_pack?.length
          ? products_pack
              .filter(pack => pack.is_variant === false)
              .map(item => {
                return {
                  id: item.product_id,
                  stock: item.stock,
                  quantity: item.quantity
                }
              })
          : []

      variants.forEach(variant => {
        variant.title = product?.categories_array.includes(Number(Env.get('ID_RESERVE')) as any)
          ? variant.title.startsWith('Reserva - ')
            ? variant.title
            : `Reserva - ${variant.title}`
          : variant.title.startsWith('Reserva - ')
          ? variant.title.replace('Reserva - ', '').trim()
          : variant.title
      })

      await Promise.all(
        variants.map(async variant => {
          const getMetafield = await BigcommerceService.getMetafieldsByVariant(id, variant.id, 'specs_variants')
          variant.specs = getMetafield
        })
      )
      const reviews = ProductService.sortReviewProductByImage(product.reviews)
      // Preparar el objeto de respuesta
      const arrayProduct = {
        main_title: product.title,
        images: product.type === 'product' ? product.images : [],
        main_description: product.description,
        categories: product.categories_array,
        stock: Math.max(...variants.map(item => item.stock)),
        brand: brand?.name ?? '',
        discount_rate: product.percent,
        discount_price: product.discount_price,
        normal_price: product.normal_price,
        cash_price: product.cash_price,
        tags: [...new Set(tags)],
        campaigns: [...new Set(campaigns)],
        options,
        variants: isPackOfVariant ? await ProductService.packsVariantIsAvailableStock(variants, id) : variants,
        buttons_pdp,
        reviews,
        reserve: product.reserve,
        warranty: warranty.length > 0 ? warranty : undefined,
        packs: pack ? products_pack : [],
        accordeon,
        section_image_sizes: image_sizes.length ? JSON.parse(image_sizes) : image_sizes,
        sameday: product.sameday,
        sizes: product.sizes,
        timer: {
          timer_status: product.timer_status,
          timer_price: product.timer_price,
          timer_datetime: product.timer_datetime
        }
      }

      return arrayProduct
    } catch (error) {
      return { status: 'error', message: error.message, stack: error.stack }
    }
  }

  public async advanced({ params }) {
    const dynamicSegments = params['*'] || []

    // Procesar los segmentos dinámicos para asignar claves y valores
    const keyValuePairs = dynamicSegments.reduce((acc, segment) => {
      if (segment.length > 0 && segment.includes('=')) {
        const [key, value] = segment.split('=')
        acc[key] = [...(acc[key] || []), value]
      } else {
        // Si no hay un '=', asumimos que es un valor adicional para la clave actual
        if (acc.currentKey) {
          acc[acc.currentKey].push(segment)
        }
      }
      return acc
    }, {})

    return keyValuePairs

    // Resto de la lógica del controlador
  }

  public async waitList({ request, response }: HttpContextContract) {
    const { id, email } = request.body()
    const waitList = new WaitList()
    waitList.id_producto = id
    waitList.email = email

    try {
      const data = await waitList.save()
      response.created({ message: data })
    } catch (error) {
      console.log(error)
      response.badRequest({ message: 'error al guardar waitList' })
    }
  }

  public async sendWaitList({ request, response }: HttpContextContract) {
    const { data } = request.body()
    try {
      const product = await BigcommerceService.getProductSingle(data.inventory.product_id)
      const formatProduct = await GeneralService.formatProduct(product)
      const contacts = await WaitList.query().where('id_producto', data.inventory.product_id)

      if (contacts && contacts.length > 0 && formatProduct.stock > 0) {
        const contactsFilters = contacts.reduce((acc: any, obj: any) => {
          const existingObj = acc.find((item: any) => item.email === obj.email)
          if (!existingObj) {
            acc.push(obj)
          }
          return acc
        }, [])
        const sendEmails: any = []
        contactsFilters.map(async contact => {
          const { id, variants, url } = formatProduct
          const { email } = contact
          const [product] = variants
          const { title, sku, image } = product
          sendEmails.push(
            new WaitingList({
              id,
              title,
              sku,
              image,
              email,
              url_product: `${Env.get('URL_SITE')}/producto${url}?id=${id}`
            }).send()
          )
        })
        await Promise.all(sendEmails)
        const idsDelete = contacts.map(contact => contact.id)
        const contactsDeleted = await WaitList.query().whereIn('id', idsDelete).delete()
        return contactsDeleted
      }

      return { status: 200, message: 'No hay contactos subscritos a la lista' }
    } catch (error) {
      console.log(error)
      response.badRequest({ message: 'error al enviar waitList' })
    }
  }

  public async getWarningStockProducts() {
    // 🛒 Obtener productos en reserva
    const getProductsinReserve = await BigcommerceService.getProductsBycategotries([
      1487,
      parseInt(Env.get('ID_RESERVE'))
    ])

    // 📋 Extraer SKUs de productos en reserva (con fallback a array vacío)
    const skuInReserve = getProductsinReserve?.map(item => item.sku) || []

    // 📦 Traigo todos los SKUs, nombres y el stock de seguridad que definimos manualmente en la tabla stock_securities
    const stockSecurities = await StockSecurities.query()
      .whereNotIn('sku', skuInReserve)
      .select('sku', 'name', 'stock_security')

    // 🏷️ Solo me quedo con los SKUs para buscar el detalle después
    const skus = stockSecurities.map(item => item.sku)

    // 📊 Ahora busco el detalle de stock real y disponible en catalog_safe_stock
    const safeStocks = await CatalogSafeStock.query().whereIn('sku', skus)

    // 🗺️ Armo un map para acceder rápido al detalle de cada SKU (¡esto me ahorra loops después!)
    const safeStockMap = safeStocks.reduce((acc, item) => {
      acc[item.sku] = item
      return acc
    }, {} as Record<string, (typeof safeStocks)[0]>)

    // 📝 Recorro todos los productos de seguridad y armo el resultado final
    const combinedData = (
      await Promise.all(
        stockSecurities.map(async sec => {
          const stockInfo = safeStockMap[sec.sku]
          if (!stockInfo) return null // Si no hay info, lo salto

          const webStock = stockInfo.available_to_sell ?? 0
          const safetyStock = sec.stock_security ?? 0

          // Por ahora no tenemos Brand local, así que lo dejo vacío
          return {
            SKU: sec.sku,
            Producto: sec.name,
            Stock: webStock,
            'Stock de seguridad': safetyStock,
            'Revisar urgente': webStock <= safetyStock ? 'SI' : 'NO',
            'Stock en Página Web': webStock <= 0 ? 'Sin Stock' : webStock,
            ID: stockInfo.product_id,
            Brand: 'Stock General'
          }
        })
      )
    ).filter(Boolean) // 🚦 Quito los nulos por si algún SKU no tiene detalle

    // 📚 Agrupo los productos por Brand (por ahora todos estarán en blanco)
    const groupedProducts = combinedData.reduce((groups, product) => {
      const channelName = product?.Brand ?? ''
      if (!groups[channelName]) {
        groups[channelName] = []
      }
      groups[channelName].push(product)
      return groups
    }, {} as Record<string, typeof combinedData>)

    // 📤 Genero el Excel y mando la alerta por correo
    const excelFile = GeneralService.generateXLSXFile(groupedProducts)

    await new ProdutStockAlert(excelFile.filePath).send()
    return excelFile
  }

  public async getStockByBsale({ params }: HttpContextContract) {
    const moment = require('moment')
    require('moment/locale/es') // Importar la localización en español

    const sku = params.sku

    const offices = await BsaleService.getOfficesBsale()

    const stock = await BsaleService.getStoresStockByProduct(sku)
    const stores = await BigcommerceService.getMetafieldsByChannel(
      Number(Env.get('BIGCOMMERCE_CHANNEL_ID')),
      'stores_bsale'
    )
    const stores_parse = JSON.parse(stores)

    moment.locale('es') // Establecer el idioma en español

    const currentDate = moment()

    const storesWithStockAndDate = stores_parse.map(store => {
      const matchingOffice = offices.items.find(office => office.id === store.id_store)
      const matchingStock = stock.items.find(item => item.office.id === store.id_store)

      let adjustedDate = moment(currentDate)
      let stockQuantity = matchingStock ? matchingStock.quantity : 0

      if (stockQuantity === 0) {
        if (store.days_1 > 0 && matchingOffice) {
          adjustedDate.add(parseInt(store.days_1), 'days')
        } else if (store.days_2 > 0 && matchingOffice && matchingOffice.id !== 16) {
          adjustedDate.add(parseInt(store.days_2), 'days')
        } else if (store.days_3 > 0) {
          adjustedDate.add(parseInt(store.days_3), 'days')
        }
      }

      const formattedDate = adjustedDate.format('D [de] MMMM [de] YYYY')

      return {
        id: store.__id,
        name: store.store,
        address: store.address,
        stock: stockQuantity,
        date: formattedDate
      }
    })
    return storesWithStockAndDate
  }

  public async getReserves({}: HttpContextContract) {
    try {
      const products = await ProductService.getProductsinReserve()

      if (products && products.length > 0) {
        // Envío de datos a Google Sheets
        const reportReserveService = new ReportReserveService()
        const result = await reportReserveService.generateReportAndSendToGoogleSheets(products)

        if (result) {
          return { success: true, message: 'Datos enviados correctamente a Google Sheets' }
        } else {
          return { success: false, message: 'Error al enviar los datos a Google Sheets' }
        }
      } else {
        return { success: false, message: 'No se encontraron productos en reserva' }
      }
    } catch (error) {
      console.error('Error en la obtención o envío de reservas:', error)
      return { success: false, message: 'Error en la obtención o envío de reservas' }
    }
  }
  public async relatedProducts({ params }: HttpContextContract) {
    try {
      let { productId } = params
      productId = Number(productId)
      if (isNaN(productId)) return
      const products = await ProductService.getRelatedProducts(productId)

      return !products || products.length === 0 ? [] : products
    } catch (error) {
      return { status: 404, message: error.message }
    }
  }
}
