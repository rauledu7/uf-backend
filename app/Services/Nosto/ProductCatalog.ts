import { CatalogProduct } from 'App/Interfaces/Nosto/CatalogProduct'
import FormatProductNosto from './FormatProductNosto'
import GetProductForNosto from './GetProductForNosto'
import { ProductNosto } from 'App/Interfaces/Nosto/ProductNosto'

export default class ProductCatalog extends GetProductForNosto implements CatalogProduct {
  CatalogProductNosto: ProductNosto[] = []

  constructor() {
    super()
  }

  public async createCatalog() {
    try {
      const productListBigcommerce = await this.getProductList()
      await this.processInBatches(productListBigcommerce)
      return this.CatalogProductNosto
    } catch (error) {
      console.error('Error al crear el catálogo:', error)
      throw error
    }
  }

  private async processInBatches(products: any[]) {
    const formatPromises = products.map(async product => {
      const formatProduct = await new FormatProductNosto(product)
      await formatProduct.structureProducts()
      return formatProduct.showProduct()
    })

    const processedProducts: any[] = await Promise.all(formatPromises)
    this.CatalogProductNosto.push(...processedProducts)
  }
}
