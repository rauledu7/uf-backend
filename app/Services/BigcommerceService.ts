import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import moment from 'moment'
import GeneralService from './GeneralService'
import * as path from 'path'
import * as fs from 'fs'
import Guest from 'App/Models/Guest'
import ImagesReview from 'App/Models/ImagesReview'

class BigcommerceService {
  //obtener categorias por arbol // canal
  static async getCategoriesTrees() {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') +
        'v3/catalog/trees/categories?tree_id:in=' +
        Env.get('BIGCOMMERCE_TREE_ID') +
        '&is_visible=1&parent_id:in=' +
        Env.get('PARENT_CATEGORY'),
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = results.data

    return data
  }

  //obtener todas las categorias por canal // Validacion para buscar solo categorias seleccionadas desde metafields
  static async getAllCategories(ids = '', is_visible = 1) {
    let endpoint =
      ids != ''
        ? Env.get('ENDPOINT_BIGCOMMERCE_URL') +
          'v3/catalog/trees/categories?tree_id:in=' +
          Env.get('BIGCOMMERCE_TREE_ID') +
          '&is_visible=' +
          is_visible +
          '&limit=250&category_id:in=' +
          ids
        : Env.get('ENDPOINT_BIGCOMMERCE_URL') +
          'v3/catalog/trees/categories?tree_id:in=' +
          Env.get('BIGCOMMERCE_TREE_ID') +
          '&is_visible=' +
          is_visible +
          '&limit=250'
    const results = await axios.get(endpoint, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = results.data
    let arrayCategories: any[] = []

    Promise.all(
      data.data.map(function (elem, _index) {
        let url = elem.url?.path ? elem.url.path : '/'
        let image = elem.image_url
        let returnCategories = {
          id: elem.category_id,
          image: image,
          title: elem.name,
          url: url,
          parent_id: elem.parent_id,
          order: elem.sort_order
        }
        arrayCategories.push(returnCategories)
      })
    )

    return arrayCategories
  }

  //obtener categorias destacadas por canal
  static async getFeaturedCategories() {
    let endpoint =
      Env.get('ENDPOINT_BIGCOMMERCE_URL') +
      'v3/catalog/trees/categories?tree_id:in=' +
      Env.get('BIGCOMMERCE_TREE_ID') +
      '&is_visible=1&limit=300&parent_id:in=' +
      Env.get('PARENT_CATEGORY')
    const results = await axios.get(endpoint, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = results.data
    let arrayCategories: any[] = []

    Promise.all(
      data.data.map(function (elem, _index) {
        if (elem.default_product_sort == 'featured') {
          let url = elem.url?.path ? elem.url.path : '/'
          let image = elem.image_url != '' ? /* Env.get('URL_ABSOLUTE_IMAGE_BIGCOMMERCE')+*/ elem.image_url : ''
          let returnCategories = {
            id: elem.category_id,
            image: image,
            title: elem.name,
            url: url,
            parent_id: elem.parent_id
          }
          arrayCategories.push(returnCategories)
        }
      })
    )

    return arrayCategories
  }

  //obtener productos destacados por canal
  static async getFeaturedProducts() {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') +
        'v3/catalog/products?is_visible=1&availability=available&is_featured=1&sort=id&direction=desc&include=images,variants',
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = results.data

    let arrayProducts = await GeneralService.formatProducts(data)

    return arrayProducts
  }

  static async getBrandProduct(brand_id) {
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/brands/' + brand_id, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = results.data.data.name

    return data
  }

  static async getBrands(ids = [], brand = 0) {
    const url_endpoint = ids.length > 0 ? 'v3/catalog/brands?id:in=' + ids : 'v3/catalog/brands?limit=200'
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + url_endpoint, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = results.data

    let brands: any[] = []
    await Promise.all(
      data.data.map(async function (elem, _index) {
        const channel = elem.search_keywords.split(',')
        const containBrand = channel.includes(Env.get('VARIABLE_BRAND'))
        if (containBrand) {
          const active = brand == elem.id ? true : false
          let arrayBrands = {
            id: elem.id,
            title: elem.name,
            url: elem?.custom_url?.url,
            image: elem.image_url,
            active: active
          }
          brands.push(arrayBrands)
        }
      })
    )

    return brands
  }

  static async getTagsByProduct(cats, tag) {
    let arrayCats: any[] = []
    let categories = await BigcommerceService.getCategoriesByTags(cats, tag)
    await Promise.all(
      categories.map(async function (elem, _index) {
        arrayCats.push(elem)
      })
    )

    return arrayCats
  }

  static async getCategoriesByProduct(categories) {
    let data: any[] = []
    await Promise.all(
      categories.map(async function (elem, _index) {
        const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/categories/' + elem, {
          headers: {
            'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
            'Content-Type': 'application/json',
            host: 'api.bigcommerce.com'
          }
        })
        data = await results.data.data
      })
    )

    return data
  }

  static async getCategoriesByTags(categories, tag) {
    let arrayCats: any[] = []
    await Promise.all(
      categories.map(async function (elem, _index) {
        const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/categories/' + elem, {
          headers: {
            'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
            'Content-Type': 'application/json',
            host: 'api.bigcommerce.com'
          }
        })
        let data = await results.data.data

        if (data.parent_id == tag) {
          arrayCats.push(data.name)
        }
      })
    )

    return arrayCats
  }

  static async getCategory(id) {
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/categories/' + id, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = await results.data.data

    return data
  }

  static async getCategoriesById(product) {
    // Convert input to array of category IDs
    const categoryIds = Array.isArray(product) ? product : typeof product === 'string' ? product.split(',') : [product]

    const BATCH_SIZE = 50 // Procesar 50 categorías a la vez
    let allCategories: any = []

    // Procesar las categorías en lotes
    for (let i = 0; i < categoryIds.length; i += BATCH_SIZE) {
      const batch = categoryIds.slice(i, i + BATCH_SIZE)
      const batchString = batch.join(',')

      try {
        const results = await axios.get(
          Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/categories?id:in=' + batchString,
          {
            headers: {
              'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
              'Content-Type': 'application/json',
              host: 'api.bigcommerce.com'
            }
          }
        )

        if (results.data && results.data.data) {
          allCategories = [...allCategories, ...results.data.data]
        }
      } catch (error) {
        console.error(`Error fetching batch of categories: ${error.message}`)
        // Continuar con el siguiente lote incluso si hay un error
        continue
      }
    }

    return allCategories
  }

  static async getRecommendedProducts() {
    let products = await BigcommerceService.getProductsByFilter({
      cat_id: Env.get('ID_RECOMMENDED'),
      brand_id: 0,
      min_price: '1',
      max_price: '9999999',
      order: 'desc',
      page: 1
    })

    return products
  }

  static async getProductSingle(id) {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + id + '?include=variants, images',
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let product = results.data.data

    return product
  }

  static async getVariantsOptionsByProduct(id) {
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + id + '/options', {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = await results.data.data
    let arrayOptions: any[] = []

    await Promise.all(
      data.map(async function (elem, _index) {
        let options = await GeneralService.getOptionsValues(elem.option_values)
        let finalOptions = options.sort((a, b) => a.id - b.id)
        let returnOptions = { id: elem.id, label: elem.display_name, options: finalOptions }
        arrayOptions.push(returnOptions)
      })
    )

    return arrayOptions
  }
  static async getMetafieldsByVariant(product_id: string, variant_id: string, key_metafield: string) {
    const endpoint =
      Env.get('ENDPOINT_BIGCOMMERCE_URL') +
      `v3/catalog/products/${product_id}/variants/${variant_id}/metafields?key=${key_metafield}`
    const accessToken = Env.get('BIGCOMMERCE_ACCESS_TOKEN')
    const options = {
      method: 'GET',
      url: endpoint,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': accessToken
      }
    }

    try {
      const response = await axios.request(options)
      let data = response.data.data && response.data.data[0] ? JSON.parse(response.data.data[0].value) : []
      if (data.length > 0) {
        data = data.map(item => {
          return {
            id: item.__id,
            name: item.title,
            value: item.text
          }
        })
      }
      return data
    } catch (error) {
      console.error(error)
      return error
    }
  }
  static async getVariantsByProduct(id, images, price_product, product_name) {
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + id + '/variants', {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = await results.data.data

    let arrayVariants: any[] = []
    await Promise.all(
      data.map(async function (elem, _index) {
        let price = elem.sale_price !== null ? elem.sale_price : elem.calculated_price
        let discount = await GeneralService.calculateDiscount(elem.price, elem.sale_price)
        let tranferPrice = await GeneralService.calculateTranferPrice(
          price_product,
          price,
          Env.get('PERCENT_DISCOUNT_TRANSFER_PRICE')
        )

        let imagesVariation = await GeneralService.getImagesByVariation(images, elem.sku, elem.image_url)
        // let id_final = data.length > 1 ? elem.id : id
        let returnVariants = {
          id: elem.id,
          title: product_name,
          sku: elem.sku,
          normal_price: elem.price,
          discount_price: elem.sale_price,
          cash_price: tranferPrice,
          discount_rate: discount,
          stock: elem.inventory_level,
          warning_stock: elem.inventory_warning_level,
          image: imagesVariation[0],
          images: imagesVariation,
          options: elem.option_values,
          quantity: 1,
          armed_cost: 0,
          armed_quantity: 1,
          weight: elem.calculated_weight,
          type: 'variant'
        }
        arrayVariants.push(returnVariants)
      })
    )

    return arrayVariants
  }

  static async getReviewsByProduct(product) {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + product + '/reviews?status=1',
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )

    let data = await results.data.data
    let arrayReviews: any[] = []
    let totalRating = 0
    const images = await ImagesReview.query().where('product_id', product).exec()

    await Promise.all(
      data.map(async function (elem, _index) {
        let imagesUrl = (images.find(image => image.title === elem.title && image.name === elem.name) || {}).images_url
        let imagesArray = imagesUrl ? imagesUrl.split(',') : []

        let returnReviews = {
          id: elem.id,
          name: elem.name,
          title: elem.title,
          text: elem.text,
          rating: elem.rating,
          date: elem.date_reviewed,
          images_url: imagesArray
        }
        totalRating = totalRating + elem.rating
        arrayReviews.push(returnReviews)
      })
    )

    let reviews = {
      product_id: product,
      quantity: arrayReviews.length,
      rating: totalRating / arrayReviews.length,
      reviews: arrayReviews
    }

    return reviews
  }

  static async getMetafieldsByProduct(product, key) {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + product + '/metafields?key=' + key,
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = await results.data.data
    if (data.length > 0) {
      data = data[0].value
    }

    return data
  }

  static async getMetafieldsByCategory(category, key) {
    let data
    const results = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/categories/' + category + '/metafields?key=' + key,
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    }

    await axios
      .request(results)
      .then(function (response) {
        data = response.data.data
        if (data.length > 0) {
          data = data[0].value
        }
      })
      .catch(function (error) {
        console.error('el error es ' + error)
        data = []
      })

    return data
  }

  static async getMetafieldsByChannel(channel, key) {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/channels/' + channel + '/metafields?key=' + key,
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = await results.data.data
    if (data.length > 0) {
      data = data[0].value
    }

    return data
  }

  static async getSpecsList(product, images) {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + product + '/custom-fields?limit=100',
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = await results.data.data

    let img = images.find(element => element.description == 'especificaciones') ?? ''

    let dataSpecs = { img: img.url_standard, data }

    return dataSpecs
  }

  static async getTimeSeconds() {
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/time', {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = await results.data
    return data
  }

  static async getActiveFilters(id_cat = 0) {
    const endpoint =
      id_cat == 0
        ? 'v3/settings/search/filters/available'
        : 'v3/settings/search/filters/available?category_id=' + id_cat
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + endpoint, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = await results.data
    let prices_range

    await Promise.all(
      data.data.map(async function (elem, _index) {
        if (elem.type == 'price') {
          prices_range = { min: elem.price_range_min, max: elem.price_range_max }
        }
      })
    )
    return prices_range
  }

  static async getProductsInit(params) {
    const cat_id = params.cat_id
    // const min_price = params.min_price
    // const max_price = params.max_price
    const order = params.order ?? 'desc'
    let max_pages = 0
    let data

    let filters = {
      limit: 50,
      page: params.page,
      availability: 'available',
      is_visible: 1,
      include: 'images,variants, custom_fields',
      sort: order == 'default' ? 'id' : 'price',
      direction: order == 'default' ? 'asc' : order
    }

    filters['inventory_level:min'] = 1

    if (cat_id && cat_id !== 0) {
      filters['categories:in'] = cat_id
    }

    if (params.brand_id > 0) {
      filters['brand_id:in'] = params.brand_id
    }

    // if (min_price > 0) {
    //   filters['price:min'] = parseInt(min_price)
    // }

    // if (max_price > 0) {
    //   filters['price:max'] = parseInt(max_price)
    // }

    const results = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products',
      params: filters,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    await axios
      .request(results)
      .then(function (response) {
        data = response.data
        max_pages = data.meta.pagination.total_pages
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })

    let arrayProducts = await GeneralService.formatProducts(data)

    let products = arrayProducts.sort((a, b) => a.sort_order - b.sort_order)

    if (order == 'asc') {
      products = arrayProducts.sort((a, b) => a.discount_price - b.discount_price)
    } else if (order == 'desc') {
      products = arrayProducts.sort((a, b) => b.discount_price - a.discount_price)
    }

    return { products: products, max_pages: max_pages }
  }

  static async getProductsByFilter(params) {
    const cat_id = params.cat_id
    // const min_price = params.min_price
    // const max_price = params.max_price
    const order = params.order ?? 'desc'
    let max_pages = 0
    let data

    let filters = {
      limit: 50,
      page: params.page,
      availability: 'available',
      is_visible: 1,
      include: 'images,variants, custom_fields',
      sort: order == 'default' ? 'id' : 'price',
      direction: order == 'default' ? 'asc' : order
    }

    if (cat_id && cat_id !== 0) {
      filters['categories:in'] = cat_id
    }

    if (params.brand_id > 0) {
      filters['brand_id:in'] = params.brand_id
    }

    // if (min_price > 0) {
    //   filters['price:min'] = parseInt(min_price)
    // }

    // if (max_price > 0) {
    //   filters['price:max'] = parseInt(max_price)
    // }

    const results = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products',
      params: filters,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    await axios
      .request(results)
      .then(function (response) {
        data = response.data
        max_pages = data.meta.pagination.total_pages
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })

    let arrayProducts = await GeneralService.formatProducts(data)

    let products = arrayProducts.sort((a, b) => a.sort_order - b.sort_order)

    if (order == 'asc') {
      products = arrayProducts.sort((a, b) => a.discount_price - b.discount_price)
    } else if (order == 'desc') {
      products = arrayProducts.sort((a, b) => b.discount_price - a.discount_price)
    }

    return { products: products, max_pages: max_pages }
  }

  static async getProductsByFiltersOutOfStock(params) {
    const cat_id = params.cat_id
    const min_price = params.min_price
    const max_price = params.max_price
    const order = params.order ?? 'desc'
    let max_pages = 0
    let data

    let filters = {
      limit: 50,
      page: params.page,
      availability: 'available',
      is_visible: 1,
      include: 'images,variants, custom_fields',
      sort: order == 'default' ? 'id' : 'price',
      direction: order == 'default' ? 'asc' : order
    }

    filters['inventory_level:max'] = 0

    if (params.cat_id > 0) {
      filters['categories:in'] = cat_id
    }

    if (params.brand_id > 0) {
      filters['brand_id:in'] = params.brand_id
    }

    if (min_price > 0) {
      filters['price:min'] = parseInt(min_price)
    }

    if (max_price > 0) {
      filters['price:max'] = parseInt(max_price)
    }

    const results = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products',
      params: filters,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    await axios
      .request(results)
      .then(function (response) {
        data = response.data
        max_pages = data.meta.pagination.total_pages
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })

    let arrayProducts = await GeneralService.formatProducts(data)

    let products = arrayProducts.sort((a, b) => a.sort_order - b.sort_order)

    if (order == 'asc') {
      products = arrayProducts.sort((a, b) => a.discount_price - b.discount_price)
    } else if (order == 'desc') {
      products = arrayProducts.sort((a, b) => b.discount_price - a.discount_price)
    }

    return { products: products, max_pages: max_pages }
  }

  static async getCustomFieldsFilter(id_cat) {
    let products = await BigcommerceService.getProductsMetafieldsByCategories(id_cat)
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + products + '/custom-fields',
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = await results.data.data

    return data
  }

  static async getProductsMetafieldsByCategories(id_cat) {
    let data
    let filters = {
      'categories:in': id_cat,
      include: 'custom_fields',
      limit: 50
    }
    const results = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products',
      params: filters,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    await axios
      .request(results)
      .then(function (response) {
        data = response.data
      })
      .catch(function (error) {
        console.error('el error es ' + error)
      })

    let arrayMetafields = await GeneralService.getCustomFieldsByProduct(data)

    return arrayMetafields
  }

  static async getProductBySku(sku) {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') +
        'v3/catalog/products?is_visible=1&availability=available&sort=id&direction=desc&include=images,variants&sku=' +
        sku,
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = results.data
    let arrayProducts = await GeneralService.formatProducts(data)

    return arrayProducts
  }

  static async getManyProductsBySku(sku_packs) {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') +
        'v3/catalog/products?is_visible=1&availability=available&sort=id&direction=desc&include=images,variants&sku:in=' +
        sku_packs,
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = results.data

    // let arrayProducts = await GeneralService.formatProducts(data)

    return data
  }

  static async getManyProductsVariantsBySku(sku_packs) {
    try {
      const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/variants?sku:in=' + sku_packs, {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      })
      let data = results.data

      return data
    } catch (error) {
      throw error
    }
  }

  static async getOrdersByCustomer(client_id) {
    moment.locale('es')
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders/?customer_id=' + client_id, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = results.data

    let arrayOrders: any[] = []
    await Promise.all(
      data.map(async function (elem, _index) {
        let returnReviews = {
          id: _index,
          date: moment(elem.date_created).format('LL'),
          order: elem.id,
          status: elem.status_id,
          total: elem.total_inc_tax
        }
        arrayOrders.push(returnReviews)
      })
    )

    return arrayOrders
  }

  static async getOrderById(order_id) {
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders/' + order_id, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = results.data

    return data
  }

  static async getProductsByOrder(order_id) {
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders/' + order_id + '/products', {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = results.data

    return data
  }

  static async getAddressesByCustomer(client_id) {
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers/addresses', {
      params: { 'customer_id:in': client_id },
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = results.data

    let arrayAddresses: any[] = []
    await Promise.all(
      data.data.map(async function (elem, _index) {
        // let type = elem.postal_code == 1 ? 'envio' : 'facturacion'
        let returnReviews = {
          id: _index,
          id_bigcommerce: elem.id,
          first_name: elem.first_name,
          last_name: elem.last_name,
          address1: elem.address1,
          address2: elem.address2,
          region: elem.state_or_province,
          commune: elem.city,
          phone: elem.phone,
          type: elem.address_type
        }
        arrayAddresses.push(returnReviews)
      })
    )

    return arrayAddresses
  }

  static async getShippingAddress(order_id) {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders/' + order_id + '/shipping_addresses',
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = results.data

    return data
  }

  static async setMetafieldByOrder(order, value, namespace, key) {
    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/orders/' + order.id + '/metafields',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        permission_set: 'write_and_sf_access',
        namespace: namespace,
        key: key,
        value: value
      }
    }

    return await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })
  }

  static async getIdMetafieldByOrder(order_id, key) {
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/orders/' + order_id + '/metafields', {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = results.data

    let documentTypeElement = data.data.find(element => element.key === key)

    return documentTypeElement
  }

  // static async getMetafieldValueById(order_id, key) {
  //   const metafield_id = await BigcommerceService.getIdMetafieldByOrder(order_id, key)
  //   return metafield_id
  //   const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/orders/' + order_id + '/metafields/'+metafield_id, {
  //     headers: {
  //       'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
  //       'Content-Type': 'application/json',
  //       'host': 'api.bigcommerce.com'
  //     },
  //   })
  //   let data = results.data

  //   return data
  // }

  static async getProductsByBrand(params) {
    const brand_id = params.brand_id
    const min_price = params.min_price
    const max_price = params.max_price
    const order = params.order ?? 'desc'
    let max_pages = 0
    let data

    let filters = {
      limit: 15,
      page: params.page,
      brand_id: brand_id,
      availability: 'available',
      is_visible: 1,
      include: 'images,variants, custom_fields',
      sort: 'price',
      direction: order
    }

    if (params.cat_id != 0) {
      filters['categories:in'] = params.cat_id
    }

    if (min_price.length > 0) {
      filters['price:min'] = parseInt(min_price)
    }

    if (max_price.length > 0) {
      filters['price:max'] = parseInt(max_price)
    }

    const results = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products',
      params: filters,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    await axios
      .request(results)
      .then(function (response) {
        data = response.data
        max_pages = data.meta.pagination.total_pages
      })
      .catch(function (error) {
        console.error('el error es ' + error)
      })

    let arrayProducts = await GeneralService.formatProducts(data)

    return { products: arrayProducts, max_pages: max_pages }
  }

  static async getCoupons(code) {
    const config = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/coupons',
      params: { code },
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    try {
      let { data } = await axios.request(config)
      return data
    } catch (error) {
      console.log(error)
    }
  }

  static async getCategoriesByParent(parent_id, is_visible = 1) {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') +
        'v3/catalog/trees/categories?parent_id:in=' +
        parent_id +
        '&is_visible=' +
        is_visible,
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = results.data

    return data
  }

  static async updateProduct(product) {
    const options = {
      method: 'PUT',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + product.id,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        inventory_level: product.stock
      }
    }
    const results = await axios.request(options)
    let data = results.data
    return data
  }

  static async getAllProducts(page = 1) {
    const results = await axios.get(
      Env.get('ENDPOINT_BIGCOMMERCE_URL') +
        'v3/catalog/products?is_visible=1&availability=available&sort=id&direction=desc&include=images,variants&limit=50&page=' +
        page,
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = results.data

    return data
  }

  static async getAllProductsRefactoring(products, visible = 1, limit = 2000) {
    const baseUrl = Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products'
    const visibilityParam = visible == 1 ? 'is_visible=1&' : ''
    const commonParams = `id:in=${products}&availability=available&sort=id&direction=desc&include=images,variants&limit=${limit}&categories:in=${Env.get(
      'PARENT_CATEGORY'
    )}`
    const url = `${baseUrl}?${visibilityParam}${commonParams}`

    const headers = {
      'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
      'Content-Type': 'application/json',
      host: 'api.bigcommerce.com'
    }

    try {
      const { data } = await axios.get(url, { headers })
      return data
    } catch (error) {
      // console.error('Error BigcommerceService.getAllProductsRefactoring: ', error);
      throw error
    }
  }

  static async getPriceProductByLink(url: string) {
    const results = await axios.get(url, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = {}
    results.data.map(product => (data[product.sku] = parseInt(product.total_inc_tax)))
    return data
  }

  static async categoryThree() {
    try {
      // Ruta relativa al archivo JSON dentro de la carpeta `resources`
      const filePath = path.join(__dirname, '..', '..', 'category-three.json')
      // Lee el contenido del archivo JSON
      const jsonData = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(jsonData)
      const result = {}
      data.categoryThree.map(category => (result[category.entityId] = category))
      return result
    } catch (error) {
      return error
    }
  }
  static async createCart(body) {
    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/carts',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: body
    }

    try {
      const response = await axios.request(options)
      return { status: 200, cart: response.data.data }
    } catch (error) {
      return { status: error.response.status, message: error.response.data }
    }
  }

  static async getCartId(token) {
    const options = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + `v3/abandoned-carts/${token}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    try {
      const response = await axios.request(options)
      return { status: 200, cart: response.data.data }
    } catch (error) {
      return { status: error.response.status, message: error.response.statusText }
    }
  }
  static async getCart(cartId) {
    const options = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + `v3/carts/${cartId}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    try {
      const response = await axios.request(options)
      return { status: 200, cart: response.data.data }
    } catch (error) {
      return { status: error.response.status, message: error.response.statusText }
    }
  }
  static async deleteCart(cartId) {
    const options = {
      method: 'DELETE',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/carts/' + cartId,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    return await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })
  }
  static async updateCustomerID(body) {
    const options = {
      method: 'PUT',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/carts/' + body.cart_id,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        customer_id: body.user_id
      }
    }

    return await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.statusText }
      })
  }
  static async addItemCart(cart_id, body) {
    const { items, custom_items = [] } = body
    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + `v3/carts/${cart_id}/items`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        line_items: items,
        custom_items: custom_items
      }
    }

    return await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })
  }
  static async updateItemCart(cart_id, item_id, item) {
    const options = {
      method: 'PUT',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + `v3/carts/${cart_id}/items/${item_id}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        line_item: item
      }
    }
    return await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })
  }
  static async deleteItemCart(cart_id, item_id) {
    const options = {
      method: 'DELETE',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + `v3/carts/${cart_id}/items/${item_id}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }
    return await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })
  }
  static async createUser(data_form) {
    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: [
        {
          email: data_form.email,
          first_name: data_form.first_name,
          last_name: data_form.last_name,
          customer_group_id: parseInt(Env.get('CUSTOMER_GROUP_ID')),
          adresses: [],
          authentication: {
            force_password_reset: false,
            new_password: data_form.password
          },
          accepts_product_review_abandoned_cart_emails: true,
          store_credit_amounts: [],
          origin_channel_id: parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID')),
          channel_ids: [parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID'))],
          form_fields: []
        }
      ]
    }

    return await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data.data[0] }
      })
      .catch(function (error) {
        return { status: error.response.status, message: 'Email ya registrado' }
      })
  }
  static async findOrCreateUser(email, cart_id) {
    try {
      const getCustomerByEmailInBigcommerce = await BigcommerceService.getCustomerByEmail(email.toLowerCase())
      const { data } = getCustomerByEmailInBigcommerce
      if (data.length < 1 || data == false) {
        const postRequest = await this.createUser({
          email,
          first_name: 'Usuario',
          last_name: 'Invitado',
          password: 'admin123'
        })
        if (postRequest.status === 200) {
          const data = postRequest.message
          const guest = await Guest.create({ customer_id: data.id, email, cart_id, recover: false })
          if (guest) {
            const cart_guest = await this.updateCustomerID({
              user_id: guest.customer_id,
              cart_id: guest.cart_id
            })
            if (cart_guest.status === 200) {
              return { status: 200, message: 'Carrito con usuario' }
            }
          }
          return guest
        } else {
          return { status: 404, error: postRequest }
        }
      }

      const userId = data[0].id

      await Guest.create({ customer_id: userId, email, cart_id, recover: false })
      const update_user = await this.updateCustomerID({ user_id: userId, cart_id })
      if (update_user.status === 200) {
        return { status: 200, message: 'Carrito con usuario' }
      }
      return { status: 400, error: update_user }
    } catch (error) {
      console.error(error)
      return { message: 'ha ocurrido un error al intentar crear carrito de compras', error: error }
    }
  }

  //obtener productos por canal
  static async getProductsByChannel(channel, page = 1, limit = 2000) {
    try {
      const options = {
        method: 'GET',
        url:
          Env.get('ENDPOINT_BIGCOMMERCE_URL') +
          `v3/catalog/products/channel-assignments?channel_id:in=${channel}&limit=${limit}&page=${page}`,
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
        }
      }

      const response = await axios.request(options)
      return response.data
    } catch (error) {
      console.error('Error en getProductsByChannel:', error)
      return {
        status: error.response?.status || 500,
        message: error.response?.statusText || 'Error al obtener productos del canal',
        data: []
      }
    }
  }

  static async getSell(channel, page = 1) {
    const options = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + `v3/easy_upsell`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    try {
      const response = await axios.request(options)
      return response
    } catch (error) {
      return { error }
    }
  }

  static async createCoupon(data) {
    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/coupons',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data
    }

    return await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })
  }

  static async getAllProductsPacks() {
    const endpointUrl = Env.get('ENDPOINT_BIGCOMMERCE_URL')
    const accessToken = Env.get('BIGCOMMERCE_ACCESS_TOKEN')
    const packsCategoryId = Env.get('ID_PACKS')
    const productsPerPage = 250

    let page = 1
    let totalPages = 1
    let allProductsPacks: any[] = []

    try {
      while (page <= totalPages) {
        const options = {
          method: 'GET',
          url: `${endpointUrl}v3/catalog/products?categories:in=${packsCategoryId}&limit=${productsPerPage}&page=${page}`,
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': accessToken
          }
        }

        const response = await axios.request(options)

        // Verifica que la estructura de la respuesta sea correcta
        if (!response.data || !response.data.meta || !response.data.meta.pagination) {
          throw new Error('Error en la estructura de la respuesta de BigCommerce')
        }

        const { data, meta } = response.data

        // Asegúrate de que los productos se agreguen correctamente
        allProductsPacks.push(...data)

        // Actualizar el número total de páginas si es la primera iteración
        if (page === 1) {
          totalPages = meta.pagination.total_pages || 1 // Asegurarse de que siempre haya al menos una página
        }

        // Incrementa la página para la siguiente iteración
        page++
      }

      // Procesar los productos obtenidos
      await Promise.all(
        allProductsPacks.map(async product => {
          const metafields_pack = await BigcommerceService.getMetafieldsByProduct(product.id, 'packs')
          if (metafields_pack.length > 0) {
            const array_pack = JSON.parse(metafields_pack)
            const items_packs = array_pack.map(item => ({
              product: item.product,
              quantity: item.quantity
            }))
            product.items_packs = items_packs
          }
        })
      )

      return allProductsPacks
    } catch (error) {
      console.error('Error al obtener los packs de BigCommerce:', error)
      throw error
    }
  }

  static async getProductPackBySku(arrayOfSku: string[]) {
    const options = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + `v3/catalog/products/?sku:in=${arrayOfSku}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    try {
      const response = await axios.request(options)

      return response.data
    } catch (error) {
      console.error(error)
      return error
    }
  }

  static async updatePacksWithReserve(arrayPacks) {
    const batchSize = 10 // Tamaño del lote
    const endpoint = Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/'
    const accessToken = Env.get('BIGCOMMERCE_ACCESS_TOKEN')

    let updatedIds: number[] = []
    let failedIds: number[] = []

    let flattenListPacks = arrayPacks.map(item => item.packFormated).flat(Infinity)
    // Crear una nueva lista sin availability_description
    const listPacks = flattenListPacks.map(({ availability_description, ...rest }) => rest)

    try {
      // TODO:Se Realiza una iteración para actualizar en lotes de 10 como lo pide Bigcommerce
      for (let i = 0; i < listPacks.length; i += batchSize) {
        const batch = listPacks.slice(i, i + batchSize)

        //TODO: Se crea un array de promesas para las solicitudes PUT
        const requests = batch.map(async pack => {
          const url = endpoint + pack.id

          const options = {
            method: 'PUT',
            url: url,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Auth-Token': accessToken
            },
            data: pack //TODO: este es el cuerpo del objeto que contiene la información del pack que se va actualizar en bigcommerce sin el id, porque el id se usa para concatenarlo con la url del endpoint de bigcommerce.
          }

          try {
            await axios.request(options)

            updatedIds.push(pack.id)
          } catch (error) {
            failedIds.push(pack.id)
          }
        })

        // TODO: se espera que todas las solicitudes se completen
        await Promise.all(requests)
      }

      return {
        status: 200,
        updateds: updatedIds.length,
        faileds: failedIds.length,
        'List Pack success': updatedIds.join('-'),
        'List Pack faileds': failedIds.join('-')
      }
    } catch (error) {
      console.error(JSON.stringify(error))
      return error
    }
  }

  static async getCustomerByEmail(email: string) {
    try {
      const results = await axios.get(
        Env.get('ENDPOINT_BIGCOMMERCE_URL') +
          `v3/customers?email:in=${email}&customer_group_id:in=${Env.get('CUSTOMER_GROUP_ID')}`,
        {
          headers: {
            'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
            'Content-Type': 'application/json',
            host: 'api.bigcommerce.com'
          }
        }
      )

      return results.data
    } catch (error) {
      console.error(error)
      return error
    }
  }
  static async getOrderProduct(order_id, product_id) {
    const results = await axios.get(
      `${Env.get('ENDPOINT_BIGCOMMERCE_URL')}v2/orders/${order_id}/products/${product_id}`,
      {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }
    )
    let data = results.data

    return data
  }
  //paso 1 categorías con mas de 250 productos
  static async getProductsByCategories(id_cat, page = 1) {
    const limit = 250 // Número de productos por página
    const filters = {
      'categories:in': id_cat,
      include: 'custom_fields',
      limit: limit,
      page: page // Página actual
    }

    const endpointUrl = Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products'
    const headers = {
      'Content-Type': 'application/json',
      'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
    }

    try {
      const response = await axios.get(endpointUrl, {
        params: filters,
        headers: headers
      })

      return response.data
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }
  //paso 2 categorías con mas de 250 productos
  static async getAllProductsByCategories(id_cat) {
    let allProducts: any[] = []
    let currentPage = 1

    try {
      let currentPageData = await BigcommerceService.getProductsByCategories(id_cat, currentPage)

      // Agrega los productos de la página actual
      allProducts = allProducts.concat(currentPageData.data)

      // Verifica si hay más páginas y obtiene los datos de cada página
      while (currentPageData.meta.pagination.links.next) {
        currentPage++ // Incrementa el número de página
        currentPageData = await BigcommerceService.getProductsByCategories(id_cat, currentPage)
        allProducts = allProducts.concat(currentPageData.data)
      }
    } catch (error) {
      console.error('Error obteniendo productos:', error)
      throw error // Propaga el error para que se maneje en un nivel superior si es necesario
    }

    return allProducts
  }

  static async getProductsRedyForRetirment(order_id) {
    const products = await this.getProductsByOrder(order_id)

    return await Promise.all(
      products.map(async product => {
        const format_product = await this.getProductSingle(product.product_id)
        return { name: format_product.name, variants: format_product.variants }
      })
    )
  }

  static async setStatusOrder(order_id, status) {
    const options = {
      method: 'PUT',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders/' + order_id,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        status_id: status
      }
    }
    const postRequest = await axios
      .request(options)
      .then(async function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error }
      })

    return postRequest
  }
  //NUEVO 👀 👀
  //obtener todas las categorias sin discrepancia // NUEVO
  static async getCategories() {
    try {
      let allCategories = []
      let currentPage = 1
      let totalPages = 1

      // Realiza solicitudes secuenciales hasta que se recuperen todas las páginas
      while (currentPage <= totalPages) {
        const results = await axios.get(`${Env.get('ENDPOINT_BIGCOMMERCE_URL')}v3/catalog/trees/categories`, {
          headers: {
            'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
            'Content-Type': 'application/json',
            host: 'api.bigcommerce.com'
          },
          params: {
            limit: 250,
            page: currentPage
          }
        })

        const { data, meta } = results.data
        allCategories = allCategories.concat(data)

        // Actualiza el número total de páginas
        totalPages = meta.pagination.total_pages

        currentPage++
      }

      return allCategories
    } catch (error) {
      console.error('Error al obtener las categorías:', error)
      return []
    }
  }
  //NUEVO 👀 👀
  static async getVariantsOptionsOfProduct(id) {
    try {
      const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + id + '/options', {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      })
      return await results.data.data
    } catch (error) {
      throw error
    }
  }

  // NUEVO 👀 👀 👀
  static async getVariantsOfProduct(id) {
    try {
      const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + id + '/variants', {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      })
      let data = await results.data.data
      return data
    } catch (error) {
      throw error
    }
  }
  // NUEVO 👀 👀 👀
  static async getSafeStockGlobal(page = 1) {
    try {
      const axiosConfig = {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      }

      const endpoint = `${Env.get('ENDPOINT_BIGCOMMERCE_URL')}v3/inventory/locations/${Env.get(
        'INVENTORY_LOCATION_ID'
      )}/items?page=`

      const firstPageResponse = await axios.get(endpoint + page, axiosConfig)
      const totalPages = firstPageResponse.data.meta.pagination.total_pages
      const pagesToFetch = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)

      const pagesData = await Promise.all(
        pagesToFetch.map(page => axios.get(endpoint + page, axiosConfig).then(response => response.data.data))
      )
      const inventory = [...firstPageResponse.data.data, ...pagesData.flat()]

      return inventory
    } catch (error) {
      console.log(error)
      return {
        status: 'Error',
        message: 'Error al intentar obtener el stock de seguridad de bigcommerce',
        code: error.message,
        title: error.response.data.title
      }
    }
  }
  static async getVariantsByProductId(product_id) {
    try {
      const endpoint = Env.get('ENDPOINT_BIGCOMMERCE_URL') + `v3/catalog/products/${product_id}/variants`

      const results = await axios.get(endpoint, {
        headers: {
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
          'Content-Type': 'application/json',
          host: 'api.bigcommerce.com'
        }
      })

      return results.data.data[0]
    } catch (error) {
      console.error('Error fetching variants:', error)
      throw error
    }
  }

  static async getAllChannels(channel) {
    const results = await axios.get(Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/channels/' + channel, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })
    let data = await results.data.data
    if (data.length > 0) {
      data = data[0].value
    }

    return data
  }
  static async getChannelByProduct(product_id) {
    const options = {
      method: 'GET',
      url:
        Env.get('ENDPOINT_BIGCOMMERCE_URL') +
        `v3/catalog/products/channel-assignments?product_id:in=${product_id}&limit=500`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    try {
      const response = await axios.request(options)
      return response.data
    } catch (error) {
      return { status: error.response.status, message: error.response.statusText }
    }
  }
  //Este metodo es para traer los metafields del pack  de variantes
  static async getMetafieldsByPacksVariants(arrayID: [{ id: number; product_id: number }]) {
    try {
      const getMetafieldsData = arrayID.length
        ? Promise.all(
            arrayID.map(async item => {
              const options = {
                method: 'GET',
                url: `${Env.get('ENDPOINT_BIGCOMMERCE_URL')}v3/catalog/products/${item.product_id}/variants/${
                  item.id
                }/metafields`,
                headers: {
                  'Content-Type': 'application/json',
                  'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
                }
              }
              const response = await axios.request(options)

              return response.data.data
            })
          )
        : []
      return getMetafieldsData
    } catch (error) {
      throw error
    }
  }

  static async createGiftCard(body) {
    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/gift_certificates',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: body
    }

    try {
      const response = await axios.request(options)
      return { status: response.status, data: response.data }
    } catch (error) {
      return { status: error.response.status, message: error.response.data }
    }
  }
  static async getGiftCard(code) {
    const options = {
      method: 'GET',
      url: `${Env.get('ENDPOINT_BIGCOMMERCE_URL')}v2/gift_certificates?code=${code}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    try {
      const response = await axios.request(options)
      return { status: response.status, data: response.data }
    } catch (error) {
      return { status: error.response.status, message: error.response.data }
    }
  }
  static async updateGiftCard(id, body) {
    const options = {
      method: 'PUT',
      url: `${Env.get('ENDPOINT_BIGCOMMERCE_URL')}v2/gift_certificates/${id}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: body
    }

    try {
      const response = await axios.request(options)
      return { status: response.status, data: response.data }
    } catch (error) {
      return { status: error.response.status, message: error.response.data }
    }
  }
  static async deleteGiftCard(id) {
    const options = {
      method: 'DELETE',
      url: `${Env.get('ENDPOINT_BIGCOMMERCE_URL')}v2/gift_certificates/${id}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    try {
      const response = await axios.request(options)
      return { status: response.status, data: response.data }
    } catch (error) {
      return { status: error.response.status, message: error.response.data }
    }
  }

  static async getCategoriesByParentFilter(parent_id, is_visible = 1, name = 'Filtros', id = '') {
    let url =
      Env.get('ENDPOINT_BIGCOMMERCE_URL') +
      'v3/catalog/trees/categories?parent_id:in=' +
      parent_id +
      '&is_visible=' +
      is_visible

    if (name && name !== '') {
      url += '&name=' + name
    }

    if (id && id !== '') {
      url += '&category_id:in=' + id
    }

    const results = await axios.get(url, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })

    let data = results.data

    return data
  }

  static async getNewFilters(parent_id, is_visible = 1, id = '') {
    let url =
      Env.get('ENDPOINT_BIGCOMMERCE_URL') +
      'v3/catalog/trees/categories?parent_id:in=' +
      parent_id +
      '&is_visible=' +
      is_visible

    if (id && id !== '') {
      url += '&category_id:in=' + id
    }

    const results = await axios.get(url, {
      headers: {
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
        'Content-Type': 'application/json',
        host: 'api.bigcommerce.com'
      }
    })

    let data = results.data

    return data
  }

  static async updateProductInventoryLocation(data: any[]) {
    const requests = data.map(async item => {
      const options = {
        method: 'PUT',
        url: `${Env.get('ENDPOINT_BIGCOMMERCE_URL')}v3/inventory/locations/${Env.get('INVENTORY_LOCATION_ID')}/items`,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
        },
        data: item
      }

      try {
        const response = await axios.request(options)
        return response.data
      } catch (error) {
        console.error(error.response ? error.response.data : error)
        return { error: error.response ? error.response.data : error }
      }
    })

    const results = await Promise.all(requests)
    return results
  }
  static async getProductsBycategotries(idsCategories: number[]) {
    const options = {
      method: 'GET',
      url: `${Env.get('ENDPOINT_BIGCOMMERCE_URL')}v3/catalog/products?categories:in=${idsCategories}`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    try {
      const response = await axios.request(options)
      return response.data.data
    } catch (error) {
      console.error(error.response ? error.response.data : error)
      return { error: error.response ? error.response.data : error }
    }
  }
}
export default BigcommerceService
