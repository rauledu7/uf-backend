import Env from '@ioc:Adonis/Core/Env'
import { string } from '@ioc:Adonis/Core/Helpers'
import * as prismicH from '@prismicio/helpers'
import CatalogSafeStock from 'App/Models/CatalogSafeStock'
import Category from 'App/Models/Category'
import UfUser from 'App/Models/UfUser'
import User from 'App/Models/User'
import axios from 'axios'
import { DateTime } from 'luxon'
import wpHash from 'wordpress-hash-node'
import XLSX from 'xlsx'
import BigcommerceService from './BigcommerceService'
import CategoryService from './CategoryService'
import MailchimpService from './MailchimpService'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'

class GeneralService {
  //obtener descuento del producto
  static async calculateDiscount(price = 0, sale_price = 0) {
    if (price === 0 || sale_price === 0) {
      return '0%'
    }

    let percent = (sale_price * 100) / price
    percent = Math.round(100 - percent)

    // Asegurarse de que el resultado sea válido
    if (percent >= 0 && percent < 100) {
      return percent + '%'
    }

    return '0%'
  }

  static async calculateTranferPrice(price = 0, sale_price = 0, percentTrasnfer = 2) {
    if (price === 0 && sale_price === 0) {
      return 0
    }
    if (sale_price !== 0) {
      const discountAmount = sale_price * (percentTrasnfer / 100)
      return Math.round(sale_price - discountAmount)
    } else {
      const discountAmount = price * (percentTrasnfer / 100)
      return Math.round(price - discountAmount)
    }
  }

  //obtener imagen miniatura del producto
  static async getThumbnailByProducts(images) {
    let thumbnail
    await Promise.all(
      images.map(async function (elem, _index) {
        if (elem.is_thumbnail == true) {
          thumbnail = elem.url_standard
        }
      })
    )

    return thumbnail
  }

  //obtener imagen hover del producto
  static async getHoverByProducts(images) {
    let hover
    await Promise.all(
      images.map(async function (elem, _index) {
        if (elem.description.includes('hover')) {
          hover = elem.url_standard
        }
      })
    )

    return hover
  }

  //obtener imagenes del producto por variacion
  static async getImagesByVariation(images, sku, thumb) {
    let arrayImages: any[] = []
    arrayImages.push(thumb)
    await Promise.all(
      images
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(async function (elem, _index) {
          if (elem.description.includes(sku)) {
            let image = elem.url_zoom
            arrayImages.push(image)
          }
        })
    )

    return arrayImages
  }

  //formatear valores de las opciones del producto
  static async getOptionsValues(options) {
    let arrayOptions: any[] = []
    await Promise.all(
      options.map(async function (elem, _index) {
        let value_data = elem.value_data?.colors ? elem.value_data.colors : elem.value_data?.image_url
        let returnOptions = { id: elem.id, label: elem.label, value_data }
        arrayOptions.push(returnOptions)
      })
    )

    return arrayOptions
  }

  //obtener botones pdp
  static async getButtonsPdp(data) {
    let arrayButtons: any[] = []
    await Promise.all(
      data.buttons_pdp.map(async function (elem, _index) {
        let description = prismicH.asText(elem.text)
        if (description) {
          description = decodeURI(description)
        }
        let returnButtons = {
          id: elem.id,
          label: elem.title[0].text,
          description,
          icon: elem.icon.url
        }
        arrayButtons.push(returnButtons)
      })
    )

    return arrayButtons
  }

  //obtener caracteristicas del landing
  static async getLandingByProduct(product) {
    let product_landing = await BigcommerceService.getMetafieldsByProduct(product, 'product_landing')
    let auxArrayLanding: any[] = []

    if (product_landing.length > 0) {
      let landing_parse = JSON.parse(product_landing)

      Promise.all(
        landing_parse.map(function (elem, _index) {
          let returnLanding = { title: elem.Title, content: elem.Content, image: elem.Image, video: elem.video ?? '' }

          auxArrayLanding.push(returnLanding)
        })
      )
    }

    return auxArrayLanding
  }

  //obtener FAQS por producto
  static async getFaqsByProduct(product) {
    let faqs = await BigcommerceService.getMetafieldsByProduct(product, 'faqs')
    let auxArrayFaqs: any[] = []

    if (faqs.length > 0) {
      let faqs_parse = JSON.parse(faqs)

      Promise.all(
        faqs_parse.map(function (elem, _index) {
          let returnLanding = { ask: elem.question, answer: elem.answer }

          auxArrayFaqs.push(returnLanding)
        })
      )
    }
    return auxArrayFaqs
  }

  //obtener iconos del producto
  static async getIconsByCategory(categories) {
    if (categories) {
      const getCategories = await Promise.all(
        categories.map(async categories => await BigcommerceService.getCategory(categories))
      )
      const principal_category = getCategories.find(obj => {
        return (
          obj.is_visible &&
          !obj.custom_url.url.includes('/entrenamiento/') &&
          !obj.custom_url.url.includes('/disciplinas/')
        )
      })
      if (principal_category) {
        let category = await BigcommerceService.getCategory(principal_category.id)
        let auxArrayIcons: any[] = []
        let icons_product_page = await BigcommerceService.getMetafieldsByCategory(category.id, 'icons_product_page')
        if (icons_product_page.length > 0) {
          let icons_parse = JSON.parse(icons_product_page)
          Promise.all(
            icons_parse.map(function (elem, _index) {
              let returnIcons = { text: elem.text_icons, icon: elem.icon_icons }
              auxArrayIcons.push(returnIcons)
            })
          )
        }
        return auxArrayIcons
      }

      return []
    }
  }

  // Obtener categorías para el menú con soporte para paginación
  static async getCategoriesFilter(active_cat = 0) {
    let categories = await BigcommerceService.getCategoriesTrees()
    let arrayMenu: any[] = []
    Promise.all(
      categories.data.map(function (elem, _index) {
        let arrayChildrens: any[] = []
        let url = elem.url == null ? '/' : elem.url.path
        let image = elem.image_url != '' ? /* Env.get('URL_ABSOLUTE_IMAGE_BIGCOMMERCE') + */ elem.image_url : ''
        let returnMenu = {
          id: elem.category_id,
          title: elem.name,
          url,
          parent_id: elem.parent_id,
          childrens: arrayChildrens,
          order: elem.sort_order,
          image
        }
        arrayMenu.push(returnMenu)
      })
    )

    Promise.all(
      arrayMenu.map(function (elem, _index) {
        Promise.all(
          arrayMenu.map(function (value, _key) {
            if (elem.parent_id == value.id) {
              // Ordenar los childrens por su propiedad 'order'
              value.childrens.push(elem)
              const childrens = value.childrens
              value.childrens = childrens.sort((a, b) => a.order - b.order)
            }
            if (value.id == active_cat) {
              value.active = 1
            }
          })
        )
      })
    )

    let filtersCategories = arrayMenu.sort((a, b) => a.order - b.order).filter(item => item.parent_id == 0)

    filtersCategories.forEach(category => {
      let childrens = category.childrens
      let isExistAll = false
      childrens.forEach(children => {
        if (children.title.includes('Ver todo')) {
          console.log('Ver todo')
          isExistAll = true
        }
      })
      if (!isExistAll && childrens.length > 0) {
        childrens.push({
          title: 'Ver todo',
          id: category.id
        })
      }
    })

    return filtersCategories
  }

  //obtener categorias para los filtros
  static async getCategoriesFilterCollection(active_cat = 0) {
    async function fetchChildrens(categoryId) {
      const childCategories = await Category.query().where('parent_id', categoryId).where('is_visible', true)

      return Promise.all(
        childCategories.map(async child => {
          const childObj: any = {
            id: child.category_id,
            title: child.title,
            url: child.url,
            parent_id: child.parent_id
          }

          const subChildrens = await fetchChildrens(child.category_id)
          if (subChildrens.length > 0) {
            childObj.childrens = subChildrens
          }

          return childObj
        })
      )
    }

    const mainCategory = await Category.findBy('category_id', active_cat)

    if (!mainCategory) {
      console.log('Product not found')
      return null
    }

    const childrens = await fetchChildrens(mainCategory.category_id)

    const category_final: any = {
      id: mainCategory.category_id,
      title: mainCategory.title,
      url: mainCategory.url,
      parent_id: mainCategory.parent_id,
      childrens: []
    }

    if (childrens.length > 0) {
      category_final.childrens = childrens
    }

    return category_final
  }

  //obtener filtros de categorias por categoria
  static async getChildrensCategories(active_cat = 0) {
    let elem = await BigcommerceService.getCategory(active_cat)
    let arrayMenu: any[] = []
    let url = elem.custom_url == null ? '/' : elem.custom_url.url
    let returnMenu = {
      id: elem.id,
      title: elem.name,
      url,
      parent_id: elem.parent_id,
      childrens: [],
      order: elem.order,
      image: elem.image
    }
    arrayMenu.push(returnMenu)

    let categories = await BigcommerceService.getAllCategories()

    function buildCategoryTree(parentId, menuArray) {
      let isFirstLevel = menuArray.parent_id === 0
      let isFirstCategory = true
      categories.forEach(function (value) {
        if (value.parent_id == parentId) {
          let childMenu = {
            id: value.id,
            title: value.title,
            url: value.custom_url == null ? '/' : value.custom_url.url,
            parent_id: value.parent_id,
            childrens: [],
            order: value.order,
            image: value.image
          }
          menuArray.childrens.push(childMenu)
          buildCategoryTree(value.id, childMenu)
          if (isFirstLevel && isFirstCategory) {
            childMenu.title = 'Ver todo' // Modificar el título de la primera categoría
            isFirstCategory = false
          }
        }
        if (value.id == active_cat) {
          value.active = 1
        }
      })
      menuArray.childrens.sort((a, b) => a.order - b.order)
    }

    buildCategoryTree(active_cat, returnMenu)

    let filtersCategories = arrayMenu.sort((a, b) => a.order - b.order)

    return filtersCategories
  }

  //obtener categorias padres para los filtros
  static async getParents(categories) {
    let arrayParent: any[] = []
    Promise.all(
      categories.map(function (elem, _index) {
        if (elem.parent_id == 0) {
          arrayParent.push(elem)
        }
      })
    )

    return arrayParent
  }

  static async formatProduct(elem) {
    let products_pack: any[] = []
    let products_pack_var: any[] = []
    let products_pack_simple: any[] = []
    // Validar si el producto es un pack
    const pack = elem.categories.includes(Number(Env.get('ID_PACKS')))
    let stock_pack = 0
    if (pack) {
      const metafields_pack = await BigcommerceService.getMetafieldsByProduct(elem.id, 'packs')
      if (metafields_pack.length > 0) {
        const array_pack = JSON.parse(metafields_pack)
        const items_packs = array_pack.map(item => ({
          product: item.product,
          quantity: item.quantity
        }))
        //recorrer los productos desde metafields para obtener productos por sku con su cantidad
        if (items_packs.length > 0) {
          products_pack_simple = await GeneralService.formatProductsPacks(items_packs)
          if (products_pack_simple.length == items_packs.length) {
            products_pack = products_pack_simple
          } else {
            let products_pack_variants: any[] = []
            await Promise.all(
              items_packs.map(async function (k, _v) {
                let product_variant = await BigcommerceService.getManyProductsVariantsBySku(k.product)
                product_variant.data[0].quantity = k.quantity
                products_pack_variants.push(product_variant.data[0])
              })
            )
            products_pack_var = await GeneralService.formatVariantsAsProducts(products_pack_variants)
          }
          products_pack = products_pack.concat(products_pack_var)
          if (products_pack && products_pack.length > 0) {
            let initial_stock = products_pack[0].stock
            stock_pack = await Promise.all(
              products_pack.map(async function (el, _key) {
                // const product_id_pack = await BigcommerceService.getProductSingle(el.id)
                // if (product_id_pack.categories.includes(Number(Env.get('ID_RESERVE')))) {
                //   return 0
                // }
                if (el.stock <= initial_stock) {
                  initial_stock = el.stock
                }
                return el.stock
              })
            ).then(stocks => Math.min(...stocks))
          }
        }
      }
    }

    // Validar si es producto en reserva
    const reserve = elem.categories.includes(Number(Env.get('ID_RESERVE')))
    // Obtener fecha de reserva
    const date_reserve = reserve ? elem.availability_description : undefined
    //validar sameday
    const sameday = elem.categories.includes(Number(Env.get('ID_SAMEDAY')))
    const despacho24horas = elem.categories.includes(Number(Env.get('ID_24HORAS')))
    const free_shipping = elem.categories.includes(Number(Env.get('ID_FREE_SHIPPING'))) ? true : false
    const pickup_in_store = elem.categories.includes(Number(Env.get('ID_PICKUP_IN_STORE'))) ? true : false
    const final_stock = pack ? stock_pack : elem.inventory_level
    const brand = elem.brand_id > 0 ? await BigcommerceService.getBrandProduct(elem.brand_id) : ''
    const type = elem.variants.length > 1 ? 'variation' : 'product'
    const url = elem.custom_url?.url == null ? '/' : elem.custom_url.url

    const get_percent = GeneralService.calculateDiscount(elem.price, elem.sale_price)
    const get_image = GeneralService.getThumbnailByProducts(elem.images)
    const get_hover = GeneralService.getHoverByProducts(elem.images)
    const get_tags = BigcommerceService.getTagsByProduct(elem.categories, Env.get('ID_BENEFITS'))
    const get_campaigns = BigcommerceService.getTagsByProduct(elem.categories, Env.get('ID_CAMPAIGNS'))
    const get_options = BigcommerceService.getVariantsOptionsByProduct(elem.id)
    const get_variants = BigcommerceService.getVariantsByProduct(
      elem.id,
      elem.images,
      elem.price,
      elem.name
      // elem.cost_price
    ) //ojo
    const get_sizes = GeneralService.getSizesByProduct(elem.categories)
    const get_advanced = GeneralService.getAdvancedFiltersByProduct(elem.categories)
    const get_tranferPrice = GeneralService.calculateTranferPrice(
      elem.price,
      elem.sale_price,
      Env.get('PERCENT_DISCOUNT_TRANSFER_PRICE')
    )

    const [percent, image, hover, tags, campaigns, options, variants, sizes, advanced, tranferPrice] =
      await Promise.all([
        get_percent,
        get_image,
        get_hover,
        get_tags,
        get_campaigns,
        get_options,
        get_variants,
        get_sizes,
        get_advanced,
        get_tranferPrice
      ])

    return {
      id: elem.id,
      product_id: elem.id,
      image,
      hover,
      categories: JSON.stringify(elem.categories),
      title: elem.name,
      brand,
      brand_id: elem.brand_id,
      tags,
      campaigns,
      stock: final_stock,
      warning_stock: 5,
      percent,
      discount_price: elem.sale_price,
      normal_price: elem.price,
      cash_price: tranferPrice,
      url,
      type,
      options,
      variants,
      quantity: elem.quantity ?? 0,
      armed_cost: 0,
      weight: elem.weight,
      sort_order: elem.sort_order,
      reserve: date_reserve,
      packs: pack ? products_pack : undefined,
      sameday,
      despacho24horas,
      free_shipping,
      pickup_in_store,
      featured: elem.is_featured,
      is_visible: elem.is_visible,
      sizes,
      advanced
    }
  }

  static async formatProducts(data) {
    const arrayProducts: any[] = []

    await Promise.all(
      data.data.map(async function (elem, index) {
        const formattedProduct = await GeneralService.formatProduct(elem)
        arrayProducts[index] = formattedProduct
      })
    )

    return arrayProducts
  }

  static async formatProductsPacks(items) {
    const formattedProducts = await Promise.all(
      items.map(async (pr, _val) => {
        const detail_product_pack = await BigcommerceService.getProductBySku(pr.product)
        if (detail_product_pack.length > 0) {
          return {
            id: detail_product_pack[0].id,
            title: detail_product_pack[0].title,
            stock:
              Number(pr.quantity) > detail_product_pack[0].stock
                ? 0
                : Math.floor(detail_product_pack[0].stock / pr.quantity),
            quantity: Number(pr.quantity)
          }
        }
        // Si el arreglo detail_product_pack está vacío, devolver null
        return null
      })
    )

    // Filtrar cualquier valor nulo que se haya devuelto en la función map
    return formattedProducts.filter(product => product !== null)
  }

  //formatear variantes como productos
  static async formatVariantsAsProducts(data) {
    const formattedProducts = await Promise.all(
      data.map(async (pr, _val) => {
        const detail_product_pack = await BigcommerceService.getProductSingle(pr.product_id)

        const searchInVariant = detail_product_pack?.variants.find(variant => variant.product_id == pr.product_id)

        if (detail_product_pack) {
          return {
            id: pr.product_id,
            sku: pr.sku,
            title: detail_product_pack.name,
            stock:
              pr.quantity && Number(pr.quantity) > searchInVariant.inventory_level
                ? 0
                : searchInVariant.inventory_level,
            quantity: Number(pr.quantity)
          }
        }
        // Si el arreglo detail_product_pack está vacío, devolver null
        return null
      })
    )
    // Filtrar cualquier valor nulo que se haya devuelto en la función map
    return formattedProducts.filter(product => product !== null)
  }

  //obtener custom fields de productos
  static async getCustomFieldsByProduct(data) {
    let arrayProducts: any[] = []
    await Promise.all(
      data.data.map(async function (elem, _index) {
        let returnProducts = { custom_fields: elem.custom_fields }
        await Promise.all(
          returnProducts.custom_fields.map(async function (key, _value) {
            arrayProducts.push(key)
          })
        )
      })
    )

    let groupedName = arrayProducts.reduce((groupedName, modelo) => {
      if (!groupedName[modelo.name]) {
        groupedName[modelo.name] = []
      }
      groupedName[modelo.name].push(modelo)
      return groupedName
    }, {})
    return groupedName
  }

  //obtener opciones de retiros en tienda
  static async getPickupStores(channel, key) {
    let pickups = await BigcommerceService.getMetafieldsByChannel(channel, key)
    let pickups_parse: any[] = []

    if (pickups.length > 0) {
      pickups_parse = JSON.parse(pickups)
    }
    return pickups_parse
  }

  //formatear data de productos para ajustarla a bsale
  static async getDetailsProductsForBsale(products, shipping_cost, iva_country = 'CL', methodGiftCard = false) {
    let arrayProducts: any[] = []
    const iva = iva_country == 'CL' ? Number(Env.get('IVA')) : 0.18
    let shipping_price = parseFloat(shipping_cost) / (1 + iva)
    const shipping = {
      netUnitValue: shipping_price,
      quantity: 1,
      taxId: '[1]',
      comment: 'Despacho'
    }
    Promise.all(
      products.map(function (elem, _index) {
        if (!elem.name.includes('Servicio de armado')) {
          let price_without_iva =
            elem.applied_discounts.length && !methodGiftCard
              ? (parseFloat(elem.total_inc_tax) - parseFloat(elem.applied_discounts[0].amount)) /
                (1 + iva) /
                elem.quantity
              : parseFloat(elem.price_ex_tax) / (1 + iva)
          let returnProducts = {
            code: elem.sku,
            netUnitValue: price_without_iva,
            quantity: elem.quantity,
            taxId: '[1]',
            comment: elem.name
          }
          arrayProducts.push(returnProducts)
        } else {
          arrayProducts.push({
            netUnitValue: elem.applied_discounts.length
              ? parseFloat(elem.discounted_total_inc_tax) / (1 + iva)
              : parseFloat(elem.price_ex_tax) / (1 + iva),
            quantity: elem.quantity,
            taxId: '[1]',
            comment: elem.name
          })
        }
      })
    )
    if (shipping_cost > 0) {
      arrayProducts.push(shipping)
    }

    return arrayProducts
  }
  //formatear data de productos para ajustarla a siigo
  static async getDetailsProductsForSiigo(products, shipping_cost) {
    let arrayProducts: any[] = []
    const iva = Number(Env.get('IVA'))
    const id_tax = Env.get('SIIGO_ID_TAX')
    let shipping_price = parseFloat(shipping_cost) / (1 + iva)
    console.log('precio envio', shipping_price.toFixed(5))
    const shipping = {
      price: shipping_price.toFixed(4),
      quantity: 1,
      taxes: [{ id: id_tax }],
      code: '55555555', // 'Despacho',
      description: 'Envío a domicilio'
    }
    Promise.all(
      products.map(function (elem, _index) {
        if (!elem.name.includes('Servicio de armado') && !elem.name.includes('Pago contraentrega')) {
          let price_without_iva = parseFloat(elem.price_ex_tax) / (1 + iva)
          console.log('producto sin iva', price_without_iva.toFixed(5))
          let returnProducts = {
            code: elem.sku,
            price: price_without_iva.toFixed(5),
            quantity: elem.quantity,
            taxes: [{ id: id_tax }],
            description: elem.name
          }
          arrayProducts.push(returnProducts)
        } else if (elem.name.includes('Servicio de armado')) {
          arrayProducts.push({
            code: 'Codigo de servicio de armado',
            price: (parseFloat(elem.price_ex_tax) / (1 + iva)).toFixed(5),
            quantity: elem.quantity,
            taxes: [{ id: id_tax }],
            description: elem.name
          })
        } else if (elem.name.includes('Pago contraentrega')) {
          //crear servicio contraentrega con el valor con iva del pago contraentrega
          const contraentrega_without_iva = elem.price_ex_tax / (1 + iva)
          const contraentrega = {
            price: contraentrega_without_iva.toFixed(5),
            quantity: 1,
            taxes: [{ id: id_tax }],
            code: '987654321',
            description: 'Servicio Contraentrega'
          }
          arrayProducts.push(contraentrega)
        }
      })
    )

    if (shipping_cost > 0) {
      arrayProducts.push(shipping)
    }

    return arrayProducts
  }
  static async addNewsLetter(email) {
    const apiKey = Env.get('API_KEY_SENDINBLUE')
    const listIds = [Number(Env.get('LIST_ID_NEWSLETTER_SENDINBLUE'))]

    const options = {
      method: 'POST',
      url: 'https://api.sendinblue.com/v3/contacts',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      data: { email, listIds }
    }

    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error }
      })

    return postRequest
  }

  static async getAdvancedFilters(id, id_filters, products) {
    const parentCategories = await this.getParentCategories(id_filters)
    const childCategoryIds = this.extractChildCategoryIds(parentCategories)

    const productsWithCategories = this.filterProductsByCategories(products, childCategoryIds)
    const categoryIdsInProducts = this.extractCategoryIdsFromProducts(productsWithCategories, childCategoryIds)

    const childCategories = await this.fetchChildCategories(categoryIdsInProducts)
    const filters = await this.buildFiltersWithChildren(categoryIdsInProducts, childCategories)

    return this.removeDuplicateFilters(filters)
  }

  // 🌳 Obtiene las categorías padre
  private static async getParentCategories(id_filters: number) {
    const parents = await BigcommerceService.getCategoriesByParent(id_filters)
    return parents.data
  }

  // 🆔 Extrae los IDs de las categorías hijas
  private static extractChildCategoryIds(parentCategories: any[]): number[] {
    return parentCategories.map(item => Number(Object.values(item)[0]))
  }

  // 🏷️ Filtra productos que contienen las categorías especificadas
  private static filterProductsByCategories(products: any[], categoryIds: number[]): any[] {
    return products.filter(product => product.categories.some(category => categoryIds.includes(category)))
  }

  // 📋 Extrae IDs de categorías de los productos filtrados
  private static extractCategoryIdsFromProducts(products: any[], categoryIds: number[]): number[] {
    return products.flatMap(product => product.categories.filter(category => categoryIds.includes(category)))
  }

  // 👶 Obtiene las categorías hijas de forma concurrente
  private static async fetchChildCategories(categoryIds: number[]): Promise<any[]> {
    const childrenPromises = categoryIds.map(async id => {
      const children = await BigcommerceService.getCategoriesByParent(id)
      return children.data.map(child => ({
        id: child.id,
        title: child.name,
        parent_id: child.parent_id
      }))
    })

    const childrenResults = await Promise.all(childrenPromises)
    return childrenResults.flat()
  }

  // 🏗️ Construye filtros con sus categorías hijas
  private static async buildFiltersWithChildren(categoryIds: number[], childCategories: any[]): Promise<any[]> {
    const filterPromises = categoryIds.map(async id => {
      const category = await BigcommerceService.getCategory(id)
      const children = this.findChildrenForCategory(id, childCategories)

      return {
        id: category.id,
        title: category.name,
        parent_id: category.parent_id,
        childrens: children
      }
    })

    return await Promise.all(filterPromises)
  }

  // 🔍 Encuentra las categorías hijas para una categoría específica
  private static findChildrenForCategory(categoryId: number, childCategories: any[]): any[] {
    const childrenMap = new Map()
    const result: any = []

    childCategories.forEach(child => {
      if (child.parent_id === categoryId && !childrenMap.has(child.id)) {
        childrenMap.set(child.id, true)
        result.push(child)
      }
    })

    return result
  }

  // 🚫 Elimina filtros duplicados
  private static removeDuplicateFilters(filters: any[]): any[] {
    const uniqueMap = new Map()
    const result: any = []

    filters.forEach(filter => {
      if (!uniqueMap.has(filter.id)) {
        uniqueMap.set(filter.id, true)
        result.push(filter)
      }
    })

    return result
  }

  //filtrar cupones por el id de usuario
  static async filterCouponByUser(data, code) {
    code = code + '-'
    const coupons = data.filter(coupon => coupon.code.startsWith(code))

    return coupons
  }

  //formatear data de productos para su uso en merchant center
  static async formatProductsMerchantCenter(data) {
    let arrayProducts: any = []
    await Promise.all(
      data.map(async function (elem, _index) {
        if (elem.name != '' && elem.variants && elem.variants.length > 0) {
          // Usar el método optimizado que procesa todas las variantes de una vez
          const products = await GeneralService.formatVariantMerchantCenter(elem.variants)
          arrayProducts.push(...products)
        }
      })
    )
    return arrayProducts
  }

  /**
   * Versión optimizada para formatear variantes para Google Merchant Center
   * Reduce consultas a la base de datos y mejora rendimiento
   */
  static async formatVariantMerchantCenter(variants: any[]) {
    try {
      console.log('🔄 Iniciando formateo optimizado de variantes...')

      // 1. Obtener todos los productos de una vez (evita N+1 queries)
      const productIds = [...new Set(variants.map(v => v.product_id))].filter(id => id !== null && id !== undefined)
      const products = await ProductsBigcommerce.query()
        .whereIn('product_id', productIds)
        .select('product_id', 'url', 'description')

      // 2. Crear mapa para acceso rápido
      const productsMap = new Map(products.map(p => [String(p.product_id), p]))

      // 5. Formatear variantes sin consultas adicionales
      const formattedVariants = variants.map(variant => {
        const product = productsMap.get(String(variant.product_id))
        const productUrl = product?.url || ''
        const formattedText = product?.description
          ? string.excerpt(product.description, 5000, { completeWords: true })
          : ''

        // Extraer el label de las opciones si existe
        let optionLabel = ''
        let hasOptions = false
        if (variant.options && Array.isArray(variant.options) && variant.options.length > 0) {
          hasOptions = true
          const firstOption = variant.options[0]
          if (firstOption.label && firstOption.label.trim() !== '') {
            optionLabel = ' - ' + firstOption.label
          }
        }

        // Construir la URL condicionalmente
        let link = Env.get('URL_SITE') + '/producto' + productUrl + '?id=' + variant.product_id
        if (hasOptions) {
          link += '&dataVariant=' + variant.id
        }

        return {
          id: variant.id || variant.product_id,
          title: (variant.title || variant.name) + optionLabel,
          description: formattedText,
          link,
          image_link: variant.image_url || variant.image,
          availability: variant.stock > 0 ? 'in_stock' : 'out_of_stock',
          price: {
            value: variant.discount_price || variant.sale_price || variant.normal_price || variant.price,
            currency: Env.get('CURRENCY')
          },
          product_type: variant.category || '',
          condition: 'new',
          identifier_exists: 'no'
        }
      })

      console.log(`✅ Formateo completado: ${formattedVariants.length} variantes procesadas`)
      return formattedVariants
    } catch (error) {
      console.error('❌ Error al formatear variantes para Merchant Center:', error)
      throw error
    }
  }

  static async returnVariant(variant) {
    function decodeAcentos(text) {
      const entities = {
        '&aacute;': 'á',
        '&eacute;': 'é',
        '&iacute;': 'í',
        '&oacute;': 'ó',
        '&uacute;': 'ú',
        '&ntilde;': 'ñ'
      }

      return text.replace(/&[a-z]+;/g, entity => entities[entity] || entity)
    }

    const strippedText = variant.description.replace(/<[^>]+>/g, '')
    const decodedText = decodeAcentos(strippedText)
    const formattedText = decodedText.replace(/\n&nbsp;\n/g, '')

    return {
      id: variant.length > 1 ? variant.id : variant.product_id,
      title: variant.title,
      description: formattedText,
      link: Env.get('URL_SITE') + '/producto' + variant.url,
      image_link: variant.image_url,
      availability: variant.inventory_level > 0 ? 'in_stock' : 'out_of_stock',
      price: {
        value: variant.sale_price ? variant.sale_price : variant.price,
        currency: Env.get('CURRENCY')
      },
      product_type: variant.category,
      condition: 'New',
      identifier_exists: 'no'
    }
  }

  //formatear data de variantes para su uso en merchant center
  static async getPrincipalCategory(categories) {
    let cats: any = await BigcommerceService.getCategoriesById(categories)
    // Primero, ordena las categorías por la cantidad de elementos en la URL (profundidad).
    cats.sort((cat1, cat2) => {
      if (cat1.custom_url && cat2.custom_url) {
        const urlParts1 = cat1.custom_url.url.split('/').filter(Boolean)
        const urlParts2 = cat2.custom_url.url.split('/').filter(Boolean)
        return urlParts2.length - urlParts1.length
      }
    })
    // Luego, encuentra la categoría visible con la mayor cantidad de elementos en la URL.
    const principal_category = cats.find(
      obj =>
        (obj.is_visible && obj.parent_id !== Env.get('ID_DISCIPLINAS') && obj.name != 'Disciplinas') ||
        obj.name == 'Outlet'
    )

    // Si deseas obtener solo la última parte de la URL, puedes hacer lo siguiente:
    if (principal_category && principal_category.custom_url && principal_category.custom_url.url) {
      const urlParts = principal_category.custom_url.url.split('/').filter(Boolean)
      const lastPartOfUrl = urlParts[urlParts.length - 1]
      const category = GeneralService.capitalizeWords(lastPartOfUrl.replace(/-/g, ' '))
      // const principal_category = cats.find(obj => obj.parent_id === 0 && obj.is_visible);

      return category
    } else {
      // Manejo del caso donde no se encuentra una categoría válida
      // console.log('No se encontró una categoría válida.');
      return '' // O cualquier otro valor que indique que no se pudo obtener la categoría principal.
    }
  }

  static async capitalizeWords(str) {
    return str.replace(/\b\w/g, match => match.toUpperCase())
  }

  //consultar usuario en la base de datos de wc
  static async getUserByEmail(email) {
    const user = await UfUser.findBy('user_email', email)
    if (user) {
      return user
    }
  }

  static async validatePassword(user, password) {
    const hash = user.user_pass

    const isValid = wpHash.CheckPassword(password, hash)

    if (isValid) {
      console.log('El hash y la clave corresponden.')
      return true
    } else {
      console.log('El hash y la clave no corresponden.')
      return false
    }
  }

  static async getUserModel(email) {
    const user = await User.findBy('email', email)

    if (user) {
      return user
    }
  }

  static async getSizesByProduct(categories) {
    const json_stores = {
      napoleon: {
        small: categories.includes(Number(Env.get('ID_SMALL_NAPOLEON'))),
        medium: categories.includes(Number(Env.get('ID_MEDIUM_NAPOLEON'))),
        big: categories.includes(Number(Env.get('ID_BIG_NAPOLEON')))
      },
      vitacura: {
        small: categories.includes(Number(Env.get('ID_SMALL_VITACURA'))),
        medium: categories.includes(Number(Env.get('ID_MEDIUM_VITACURA'))),
        big: categories.includes(Number(Env.get('ID_BIG_VITACURA')))
      },
      condor: {
        small: categories.includes(Number(Env.get('ID_SMALL_CONDOR'))),
        medium: categories.includes(Number(Env.get('ID_MEDIUM_CONDOR'))),
        big: categories.includes(Number(Env.get('ID_BIG_CONDOR')))
      },
      quilicura: {
        small: categories.includes(Number(Env.get('ID_SMALL_QUILICURA'))),
        medium: categories.includes(Number(Env.get('ID_MEDIUM_QUILICURA'))),
        big: categories.includes(Number(Env.get('ID_BIG_QUILICURA')))
      },
      vina: {
        small: categories.includes(Number(Env.get('ID_SMALL_VINA'))),
        medium: categories.includes(Number(Env.get('ID_MEDIUM_VINA'))),
        big: categories.includes(Number(Env.get('ID_BIG_VINA')))
      },
      concon: {
        small: categories.includes(Number(Env.get('ID_SMALL_CONCON'))),
        medium: categories.includes(Number(Env.get('ID_MEDIUM_CONCON'))),
        big: categories.includes(Number(Env.get('ID_BIG_CONCON')))
      },
      concepcion: {
        small: categories.includes(Number(Env.get('ID_SMALL_CONCEPCION'))),
        medium: categories.includes(Number(Env.get('ID_MEDIUM_CONCEPCION'))),
        big: categories.includes(Number(Env.get('ID_BIG_CONCEPCION')))
      },
      retirocondes: {
        small: categories.includes(Number(Env.get('ID_SMALL_RETIROCONDES'))),
        medium: categories.includes(Number(Env.get('ID_MEDIUM_RETIROCONDES'))),
        big: categories.includes(Number(Env.get('ID_BIG_RETIROCONDES')))
      },
      buenaventura: {
        small: categories.includes(Number(Env.get('ID_SMALL_BUENAVENTURA'))),
        medium: categories.includes(Number(Env.get('ID_MEDIUM_BUENAVENTURA'))),
        big: categories.includes(Number(Env.get('ID_BIG_BUENAVENTURA')))
      },
      condes: {
        small: categories.includes(Number(Env.get('ID_SMALL_CONDES'))),
        medium: categories.includes(Number(Env.get('ID_MEDIUM_CONDES'))),
        big: categories.includes(Number(Env.get('ID_BIG_CONDES')))
      }
    }
    return json_stores
  }

  static async getAdvancedFiltersByProduct(categories: any) {
    let categoriesArray = await BigcommerceService.getAllCategories(categories, 0)
    // Filtrar objetos que contienen "filtros" en la URL
    let filters = categoriesArray.filter(obj => obj.url.includes('filtros'))
    const ids: any = filters.map(elem => elem.id)
    return ids
  }
  //NUEVO 👀 👀
  static async FormatProductsArray(products: any[]) {
    try {
      const productInfoArray = await Promise.all(
        products.map(async product => {
          // Validar si es producto en reserva
          const reserve = product.categories.includes(Number(Env.get('ID_RESERVE')))
          // Obtener fecha de reserva
          let child_reserve: any = reserve ? await CategoryService.getDateReserve() : null
          const isReserve =
            child_reserve !== null ? child_reserve.filter(item => product.categories.includes(item.category_id)) : null
          const date_reserve = isReserve && isReserve.length ? isReserve[0].title : null //es sameday?
          const sameday = product.categories.includes(Number(Env.get('ID_SAMEDAY')))
          //tiene despacho 24 horas?
          const despacho24horas = product.categories.includes(Number(Env.get('ID_24HORAS')))

          //tiene envio gratis?
          const free_shipping = product.categories.includes(Number(Env.get('ID_FREE_SHIPPING')))

          //tiene retiro en tienda?
          const pickup_in_store = product.categories.includes(Number(Env.get('ID_PICKUP_IN_STORE')))
          // tiene reviews?
          const reviews = await BigcommerceService.getReviewsByProduct(product.id)
          //es turbo?
          const turbo = product.categories.includes(Number(Env.get('ID_TURBO')))

          const volumetric = (product.width * product.depth * product.height) / 4000

          let weight = volumetric > product.weight ? volumetric : product.weight
          weight = Env.get('COUNTRY_CODE') === 'PE' ? product.weight : weight

          const sku = product.variants[0].sku
          const inventoryLevel: any[] = await CatalogSafeStock.query().where('sku', sku.trim()).pojo()

          const titleMetafieldTimerByCountry =
            Env.get('COUNTRY_CODE') === 'CL'
              ? 'timer_product'
              : Env.get('COUNTRY_CODE') === 'CO'
              ? 'timer_product_co'
              : 'timer_product_pe'
          let timerMetafield = await BigcommerceService.getMetafieldsByProduct(product.id, titleMetafieldTimerByCountry)
          timerMetafield = timerMetafield.length ? JSON.parse(timerMetafield) : []
          const timerPrice = timerMetafield ? timerMetafield.timer_price : 0
          const timerStatus = timerMetafield ? timerMetafield.timer_status : false
          const timerDatetime =
            timerMetafield && timerMetafield.timer_datetime
              ? DateTime.fromJSDate(new Date(timerMetafield.timer_datetime)).toISO()
              : undefined

          return {
            product_id: product.id,
            image: product.images.find(image => image.is_thumbnail)?.url_standard || '',
            images: product.images.reverse(),
            hover: product.images.find(image => image?.description?.includes('hover'))?.url_standard || '',
            title: product.name,
            page_title: product.name,
            description: product.description,
            brand_id: product.brand_id,
            categories_array: JSON.stringify(product.categories),
            stock:
              inventoryLevel && inventoryLevel.length
                ? inventoryLevel[0].available_to_sell
                : Math.max(
                    0,
                    product.inventory_level -
                      (typeof inventoryLevel[0]?.safety_stock === 'number' ? inventoryLevel[0].safety_stock : 0)
                  ),
            warning_stock: inventoryLevel[0]?.safety_stock || 0,
            normal_price: product.price,
            discount_price: product.sale_price,
            cash_price: await GeneralService.calculateTranferPrice(
              product.price,
              product.sale_price,
              Env.get('PERCENT_DISCOUNT_TRANSFER_PRICE')
            ),
            percent: await GeneralService.calculateDiscount(product.price, product.sale_price),
            url: product.custom_url?.url ?? '/',
            type: product.variants.length > 1 ? 'variation' : 'product',
            quantity: product.quantity ?? 0,
            armed_cost: 0,
            weight,
            sort_order: product.sort_order,
            ...(!product.categories.includes(Number(Env.get('ID_PACKS')))
              ? reserve
                ? { reserve: date_reserve }
                : { reserve: '' }
              : !reserve
              ? ''
              : {}),
            reviews: JSON.stringify(reviews),
            sameday: sameday !== undefined ? sameday : undefined,
            despacho24horas: despacho24horas !== undefined ? despacho24horas : undefined,
            free_shipping: free_shipping !== undefined ? free_shipping : undefined,
            pickup_in_store: pickup_in_store !== undefined ? pickup_in_store : undefined,
            featured: product.is_featured,
            is_visible: product.is_visible,
            sizes: await GeneralService.getSizesByProduct(product.categories),
            turbo,
            meta_keywords: product?.meta_keywords?.length ? product.meta_keywords : undefined,
            meta_description: product?.meta_description?.length > 0 ? product.meta_description : undefined,
            timer_status: timerStatus,
            timer_price: timerPrice,
            timer_datetime: timerDatetime
          }
        })
      )
      //console.log(productInfoArray.filter(p=>p.brand_id == 0).map(p=>{p.product_id}))
      return productInfoArray
    } catch (error) {
      console.error('Error extracting product info:', error)
      return []
    }
  }

  //NUEVO 👀 👀
  static async formatOptionsByVariantByProduct(product) {
    let data = await BigcommerceService.getVariantsOptionsOfProduct(product.id)

    //  Verificar si data está vacío
    if (!data || data.length === 0) {
      return [] // Retornar un array vacío si data está vacío
    }
    let arrayOptions: any[] = []
    await Promise.all(
      data.map(async function (elem, _index) {
        let options = await GeneralService.getOptionsValues(elem.option_values)
        let finalOptions = options.sort((a, b) => a.id - b.id)
        let returnOptions = {
          id: elem.id,
          label: elem.display_name,
          product_id: elem.product_id,
          options: finalOptions
        }
        arrayOptions.push(returnOptions)
      })
    )

    return arrayOptions
  }
  //NUEVO 👀 👀
  static async formatVariantsByProduct(product) {
    let data = await BigcommerceService.getVariantsOfProduct(product.id)
    let arrayVariants: any[] = []
    await Promise.all(
      data.map(async function (elem, _index) {
        let price = elem.sale_price !== null ? elem.sale_price : elem.calculated_price
        let discount = await GeneralService.calculateDiscount(elem.price, price)
        let tranferPrice = await GeneralService.calculateTranferPrice(
          elem.price,
          price,
          Env.get('PERCENT_DISCOUNT_TRANSFER_PRICE')
        )

        const volumetric = (elem.width * elem.depth * elem.height) / 4000

        let weight = volumetric > elem.calculated_weight ? volumetric : elem.calculated_weight
        weight = Env.get('COUNTRY_CODE') === 'PE' ? elem.calculated_weight : weight

        const inventoryLevel: any[] = await CatalogSafeStock.query().where('sku', elem.sku.trim()).pojo()

        let imagesVariation = await GeneralService.getImagesByVariation(product.images, elem.sku, elem.image_url)
        let returnVariants = {
          id: elem.id,
          sku: elem.sku,
          type: 'variant',
          image: imagesVariation[0],
          stock:
            inventoryLevel && inventoryLevel.length
              ? inventoryLevel[0].available_to_sell
              : Math.max(
                  0,
                  elem.inventory_level -
                    (typeof inventoryLevel[0]?.safety_stock === 'number' ? inventoryLevel[0].safety_stock : 0)
                ),
          main_title: product.name,
          normal_price: elem.price,
          discount_price: price,
          cash_price: tranferPrice,
          discount_rate: discount,
          warning_stock: inventoryLevel[0]?.safety_stock || 0,
          images: imagesVariation,
          quantity: 1,
          armed_cost: 0,
          armed_quantity: 1,
          weight,
          height: elem.height,
          width: elem.width,
          depth: elem.depth,
          options: elem.option_values.length ? JSON.stringify(elem.option_values) : undefined,
          related_products: product?.related_products ? JSON.stringify(product.related_products) : undefined
        }
        arrayVariants.push(returnVariants)
      })
    )

    return arrayVariants
  }
  static generateXLSXFile(data: Record<string, any[]>): { filePath: string } {
    const workbook = XLSX.utils.book_new()
    let sheetCount = 0

    for (const channelName in data) {
      if (!data.hasOwnProperty(channelName)) continue

      // Evita nombres de pestaña undefined, vacíos o no string
      if (!channelName || channelName === 'undefined' || typeof channelName !== 'string') continue

      const channelData = data[channelName]
      // Solo agrega la hoja si hay datos
      if (Array.isArray(channelData) && channelData.length > 0) {
        // Limita el nombre de la hoja a 31 caracteres (límite de Excel)
        const safeSheetName = channelName.substring(0, 31)
        const worksheet = XLSX.utils.json_to_sheet(channelData)
        XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName)
        sheetCount++
      }
    }

    // Si no se agregó ninguna hoja, crea una hoja vacía para evitar error de archivo corrupto
    if (sheetCount === 0) {
      const worksheet = XLSX.utils.aoa_to_sheet([['Sin datos']])
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SinDatos')
    }

    const filePath = 'datos.xlsx'
    XLSX.writeFile(workbook, filePath)

    return { filePath }
  }
  static async verifyFraudulentTransaction(data) {
    console.log('Verificación de orden en verifyFraudulentTransaction en GeneralService', data)

    const { total_inc_tax, discount_amount, id, ip_address, items_total, subtotal_inc_tax, payment_method } = data
    const { first_name, last_name } = data.billing_address
    // Validar que los valores sean números
    const totalIncTax = parseFloat(total_inc_tax)
    const subTotal = parseFloat(subtotal_inc_tax)
    const discountAmount = parseFloat(discount_amount)
    const couponName = ip_address
    const products = await BigcommerceService.getProductsByOrder(data.id) // data.id es el id de la orden
    console.log(`Productos de la orden ${data.id}`, products)
    // caso de uso: valida si el pedido corresponde a una compra de giftcard
    // Verifica si al menos un producto es una gift card
    const hasGiftcard = products.some(product => {
      const name = product?.name?.toLowerCase().replace(/\s+/g, ' ').trim() || ''
      return name.includes('gift card')
    })
    console.log(`Orden ${data.id} contiene al menos una giftcard: `, hasGiftcard)
    if (hasGiftcard) {
      // Si entra aqui corresponde a una compra con giftcard
      return
    }
    if (isNaN(totalIncTax) || isNaN(discountAmount)) {
      throw new Error('Invalid number format for total_inc_tax or discount_amount')
    }

    // Obtener el monto mínimo según el país
    const countryCode = Env.get('COUNTRY_CODE')
    const minAmount = countryCode === 'CL' ? 3000 : countryCode === 'CO' ? 5000 : 10 // Para PERU

    const infoOrder = {
      order_id: String(id),
      brand: Env.get('VARIABLE_BRAND'),
      discount: '',
      template: 0,
      total: `${totalIncTax} - Subtotal: ${subTotal}`,
      couponName: couponName === '' ? 'Ninguno' : couponName, // nombre del cupon
      customer: `${first_name.charAt(0).toUpperCase() + first_name.slice(1).toLowerCase()} ${
        last_name.charAt(0).toUpperCase() + last_name.slice(1).toLowerCase()
      }`,
      quantity: items_total,
      discountAmount
    }

    try {
      if (discountAmount < 1 && totalIncTax > minAmount) {
        return null // Si no hay descuento  sale
      }

      // Calculo del porcentaje de descuento
      const discountPercentage = (discountAmount / subTotal) * 100

      // Verifica si el porcentaje de descuento es igual o superior al 35%
      if (discountPercentage >= Number(Env.get('MAX_DISCOUNT_MARKETING'))) {
        infoOrder.discount = `${Math.round(discountPercentage)}%`
        infoOrder.template = 1
        return await MailchimpService.emailAlerts(infoOrder)
      }
      if (discountPercentage < 3 && payment_method.toLowerCase().trim() === 'linkify') {
        return null // si es menor al 3%  y es de linkify se sale del flujo
      }
      if (discountPercentage > 0 && couponName === '') {
        infoOrder.template = 3
        return await MailchimpService.emailAlerts(infoOrder)
      }
      // Verifica condiciones de sospecha
      if (totalIncTax <= minAmount) {
        infoOrder.template = 2
        return await MailchimpService.emailAlerts(infoOrder)
      }
    } catch (error) {
      console.error('Error verificando  transacciones sospechosas:', error)
    }

    return null
  }
}
export default GeneralService
