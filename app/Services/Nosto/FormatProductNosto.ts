import {
  CustomFields,
  // ProductNosto,
  Skus,
  VariantsCurrencies,
  Stock,
  OptionsValues
} from 'App/Interfaces/Nosto/ProductNosto'
import FormatCategoriesNosto from './FormatCategoriesNosto'
//import GeneralService from '../GeneralService'
//import BigcommerceService from '../BigcommerceService'
import Env from '@ioc:Adonis/Core/Env'
import Brand from 'App/Models/Brand'
import OptionOfProducts from 'App/Models/OptionOfProducts'
import Variant from 'App/Models/Variant'
import CategoryService from '../CategoryService'
import moment from 'moment-timezone'

//TODO: Esta clase hereda la clase FormatCategoriesNosto para usar su metodo e implementa la interfaces ProductNosto, aplicando el platrón de diseño constructor para generar objetos complejos para cumplir con la estructura de poductos de nosto

export default class FormatProductNosto extends FormatCategoriesNosto /*implements ProductNosto */ {
  url: string
  product_id: string
  name: string
  image_url: string
  price_currency_code: string
  availability: string
  rating_value?: string | undefined
  review_count?: string | undefined
  categories: string[]
  description: string
  price: number
  list_price: number
  brand: string | undefined
  tag1?: string[] | undefined
  tag2?: string[] | undefined
  tag3?: string[] | undefined
  date_published: string
  variation_id: string
  alternate_image_urls: string[] | undefined
  variations?: VariantsCurrencies | undefined
  inventory_level: number
  supplier_cost: number
  custom_fields: CustomFields
  skus?: Skus[] | undefined
  productBigcommerce: any
  constructor(product: any) {
    super()
    this.productBigcommerce = product // Guarda el objeto recibido
  }

  public async structureProducts(): Promise<void> {
    try {
      const {
        product_id,
        title,
        url,
        images,
        stock,
        reviews,
        categories_array,
        description,
        normal_price,
        discount_price,
        brand_id
      } = this.productBigcommerce

      const variants = await Variant.query().where('product_id', product_id)

      if (typeof variants === null || typeof variants === undefined) {
        throw new Error('Error fetching variant of product id: ' + product_id)
      }
      const { weight = undefined, width = undefined, depth = undefined } = variants[0] || {}

      const [tags, brand, campaigns, variantProducts, option_values, categories]: any = await Promise.all([
        CategoryService.getChildCategories(Env.get('ID_BENEFITS')),
        this.BrandProduct(brand_id),
        CategoryService.getChildCategories(Env.get('ID_CAMPAIGNS')),
        this.variantsProduct(variants, url),
        OptionOfProducts.query().where('product_id', product_id).select('label', 'product_id', 'options').pojo(),
        this.formatCategories(categories_array)
      ])
      this.url = `${Env.get('URL_SITE_PROD')}/producto/${url.substring(1)}?id=${product_id}`
      this.product_id = product_id
      this.name = title
      this.image_url = images[0]?.url_standard
      this.price_currency_code = Env.get('CURRENCY')
      this.availability = stock > 0 ? Stock.inStock : Stock.outStock
      this.rating_value = undefined
      this.review_count = String(reviews?.quantity)
      this.categories = categories
      this.description = this.normalizeDescription(description)
      this.price = discount_price || normal_price
      this.list_price = normal_price || discount_price || undefined
      this.brand = brand || ''
      this.tag1 = (await CategoryService.getCampaignsByCategory(product_id, campaigns)) || undefined
      this.tag2 = (await CategoryService.getCampaignsByCategory(product_id, tags)) || undefined
      this.tag3 = undefined
      this.date_published = moment().format('YYYY-MM-DD')
      this.variation_id = Env.get('CURRENCY_ID')
      this.alternate_image_urls = this.alternativeImageUrlProduct(images, product_id)
      this.variations = this.variantCurrencies({ normal_price, discount_price, stock })
      this.inventory_level = stock
      this.supplier_cost = normal_price
      this.custom_fields = Object.assign(
        {},
        this.customValues({ weight, width, depth }),
        this.optionsProductValues(option_values)
      )
      this.skus = variantProducts
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  private async BrandProduct(brand_id: number) {
    if (brand_id > 0) {
      const brand = await Brand.find(brand_id)
      if (brand) {
        return brand.name
      }
      return undefined
    }
  }

  private async variantsProduct(variants: any[], url_product: string): Promise<Skus[] | []> {
    if (variants && Array.isArray(variants) && variants.length > 0) {
      const skusPromises = variants.map(async variant => {
        let customFieldsOptionValues: {} | undefined = {}

        if (variant.options && variant.options.length > 0) {
          customFieldsOptionValues = this.optionsVariantValues(variant.options)
        }

        const additionalCustomFields = {
          weight: variant.weight,
          calculated_weight: variant.weight,
          width: variant.width,
          height: variant.height,
          depth: variant.depth
        }

        const customFields = Object.assign({}, customFieldsOptionValues, additionalCustomFields)

        return {
          id: variant.sku,
          name: this.name,
          price: variant.sale_price,
          list_price: variant.price,
          url: `${Env.get('URL_SITE_PROD')}/producto/${url_product.substring(1)}?id=${variant.product_id}`,
          image_url: variant.image,
          availability: variant.inventory_level > 0 ? Stock.inStock : Stock.outStock,
          inventory_level: variant.inventory_level,
          custom_fields: customFields
        }
      })

      // Esperar a que todas las promesas se resuelvan
      const skus = await Promise.all(skusPromises)

      return skus
    } else {
      return []
    }
  }

  private alternativeImageUrlProduct(images: any[], product_id: number): string[] | undefined {
    if (images && Array.isArray(images) && images.length > 0) {
      return images
        .filter(images => images.product_id == product_id)
        .map(({ url_zoom, url_standard, url_thumbnail, url_tiny }) => {
          return `${url_zoom},${url_standard},${url_thumbnail},${url_tiny}`
        })
    } else {
      return undefined
    }
  }

  private optionsProductValues(data: any[]): any | undefined {
    if (data && Array.isArray(data) && data.length > 0) {
      return data.reduce((result, item) => {
        if (item.label && item.options && Array.isArray(item.options)) {
          result[item.label] = item.options.map(option => option.label).join(',')
        }
        return result
      }, {} as any)
    } else {
      return undefined
    }
  }
  private optionsVariantValues(options: any[]): any | undefined {
    if (options && Array.isArray(options) && options.length > 0) {
      return options.reduce((item, elemento) => {
        item[elemento.option_display_name] = elemento.label
        return item
      }, {})
    } else {
      return undefined
    }
  }
  private customValues(...options: any[]): OptionsValues {
    const values = Object.assign({}, ...options)
    return values
  }

  private variantCurrencies(currenciesVariant: any): VariantsCurrencies {
    return {
      [Env.get('CURRENCY')]: {
        price_currency_code: Env.get('CURRENCY'),
        price: currenciesVariant.discount_price,
        list_price: currenciesVariant.normal_price,
        availability: currenciesVariant.stock > 0 ? Stock.inStock : Stock.outStock
      }
    }
  }

  private normalizeDescription(productDescription: string) {
    let textWithoutHTML = productDescription.replace(/<[^>]*>/g, '')
    textWithoutHTML = textWithoutHTML.replace(/&[^\s]*;/g, '')

    textWithoutHTML = textWithoutHTML.replace(/&aacute;/g, 'á')
    textWithoutHTML = textWithoutHTML.replace(/&eacute;/g, 'é')
    textWithoutHTML = textWithoutHTML.replace(/&iacute;/g, 'í')
    textWithoutHTML = textWithoutHTML.replace(/&oacute;/g, 'ó')
    textWithoutHTML = textWithoutHTML.replace(/&uacute;/g, 'ú')
    textWithoutHTML = textWithoutHTML.replace(/&ntilde;/g, 'ñ')
    textWithoutHTML = textWithoutHTML.replace(/&Aacute;/g, 'Á')
    textWithoutHTML = textWithoutHTML.replace(/&Eacute;/g, 'É')
    textWithoutHTML = textWithoutHTML.replace(/&Iacute;/g, 'Í')
    textWithoutHTML = textWithoutHTML.replace(/&Oacute;/g, 'Ó')
    textWithoutHTML = textWithoutHTML.replace(/&Uacute;/g, 'Ú')
    textWithoutHTML = textWithoutHTML.replace(/&Ntilde;/g, 'Ñ')
    textWithoutHTML = textWithoutHTML.replace(/&iexcl;/g, '¡')
    textWithoutHTML = textWithoutHTML.replace(/&iquest;/g, '¿')

    textWithoutHTML = textWithoutHTML.trim()

    return textWithoutHTML
  }

  public showProduct() {
    return {
      url: this.url,
      product_id: this.product_id,
      name: this.name,
      image_url: this.image_url,
      price_currency_code: this.price_currency_code,
      availability: this.availability,
      rating_value: this.rating_value,
      review_count: this.review_count,
      categories: this.categories,
      description: this.description,
      price: this.price,
      list_price: this.list_price,
      brand: this.brand,
      tag1: this.tag1,
      tag2: this.tag2,
      tag3: this.tag3,
      date_published: this.date_published,
      variation_id: this.variation_id,
      alternate_image_urls: this.alternate_image_urls,
      variations: this.variations,
      inventory_level: this.inventory_level,
      supplier_cost: this.supplier_cost,
      custom_fields: this.custom_fields,
      skus: this.skus
    }
  }
}
