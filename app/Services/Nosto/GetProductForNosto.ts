import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
export default class GetProductForNosto {
  public async getProductList() {
    try {
      const products = await ProductsBigcommerce.query().where('is_visible', true)
      return products
    } catch (error) {
      console.error(`Error: ${error.message}`)
      throw error
    }
  }
}
