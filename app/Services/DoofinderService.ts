import Env from '@ioc:Adonis/Core/Env'
import { Variant, Product } from 'App/Interfaces/DoofinderInterface'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
import ProductService from './ProductService'

export default class DoofinderService {
  private static arrayProducts: (Product | Variant)[] | any = []
  private static products: (Product | Variant)[] | any = []
  public static async uploadsProductsList() {
    try {
      const products = await this.getProductList()
      return this.generateCsv(products)
    } catch (error) {
      throw error
    }
  }

  private static escapeCsvValue(value) {
    if (typeof value === 'string') {
      return `"${value.replace(/"/g, '""')}"`
    } else {
      return value
    }
  }

  private static generateCsv(data) {
    if (data.length === 0) {
      return ''
    }

    const headers = Object.keys(data[0])
    const rows = data.map(item => headers.map(header => this.escapeCsvValue(item[header])))

    const csvContent = [headers.map(this.escapeCsvValue).join(',')].concat(rows.map(row => row.join(','))).join('\n')

    return csvContent
  }

  public static async getProducts() {
    try {
      const products = await ProductsBigcommerce.query().where('is_visible', true)
      const productsAndVariants = await ProductService.formatProducts(products)
      return productsAndVariants
    } catch (error) {
      throw error
    }
  }
  public static async getProductList() {
    try {
      this.products = await this.getProducts()
      this.arrayProducts = await Promise.all(
        this.products.map(async product => {
          let formattedVariants: any[] = []
          if (product?.variants?.length > 1) {
            formattedVariants = await Promise.all(
              product.variants.map(async variant => {
                return {
                  availability: variant.stock > 0 ? 'in stock' : 'out of stock',
                  best_price: variant.discount_price || variant.normal_price,
                  brand: product.brand,
                  //df_grouping_id: String(product.product_id),
                  group_id: String(product.product_id) + product?.variants[0].sku,
                  group_leader: false,
                  //df_manual_boost: 1,
                  id: variant.sku,
                  sku: variant.sku,
                  image_link: variant.image,
                  link: `${Env.get('URL_SITE_PROD')}/producto${product.url}?id=${product.product_id}`,
                  price: variant.normal_price || variant.discount_price,
                  sale_price: variant.discount_price || variant.normal_price,
                  sort_order: product.sort_order,
                  condition: 'new',
                  weight: product.weight,
                  //  width: product.width,
                  type: product.type,
                  title: `${product.title.trim()} - ${variant?.options.map(item => item.label).join('-')}`
                }
              })
            )
          }

          // (primera variante o producto sin variantes)
          const mainProduct = {
            availability:
              product?.variants?.length && product?.variants?.some(variant => variant.stock > 0)
                ? 'in stock'
                : 'out of stock',
            best_price: product?.variants[0]?.discount_price || product?.variants[0]?.normal_price || 0,
            brand: product.brand,
            //df_grouping_id: product.product_id,
            // df_manual_boost: 1,
            id: product?.variants[0].sku,
            group_id: String(product.product_id) + product?.variants[0].sku,
            group_leader: true,
            sku: product?.variants[0]?.sku || '',
            image_link: product?.variants[0]?.image || '',
            link: `${Env.get('URL_SITE_PROD')}/producto${product.url}?id=${product.product_id}`,
            price: product?.variants[0]?.normal_price || 0,
            sale_price: product?.variants[0]?.discount_price || product?.variants[0]?.normal_price || 0,
            sort_order: product.sort_order,
            condition: 'new',
            weight: product.weight,
            // width: product.width,
            type: product.type,
            title: product.title
          }

          // Retorna el producto principal junto con sus variantes
          return [mainProduct, ...formattedVariants]
        })
      )

      // Aplana el array de productos y variantes
      const result = this.arrayProducts.flat().filter(product => product?.title?.includes('Outlet') === false)
      //.filter((product) => product.price > 0)

      return result
    } catch (error) {
      throw error
    }
  }
}
