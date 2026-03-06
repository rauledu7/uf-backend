import { BaseCommand } from '@adonisjs/core/build/standalone'
import ProductService from 'App/Services/ProductService'
import ProductCacheService from 'App/Services/ProductCacheService'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'

export default class GenerateSpecialProductsCache extends BaseCommand {
  public static commandName = 'generate:special-products-cache'
  public static description = 'Generate cache for special category products'

  public static settings = {
    loadApp: true,
  }

  public async run() {
    this.logger.info('Starting to generate special products cache...')

    try {
      // Get all products for category 28
      const products28 = await ProductsBigcommerce.query()
        .preload('categories')
        .whereHas('categories', q => q.where('category_id', 28))
        .where('is_visible', true)
        .limit(600)
        .exec()

      const formattedProducts28 = await ProductService.formatProducts(products28)
      await ProductCacheService.updateCache(28, formattedProducts28)
      this.logger.info('Cache generated for category 28')

      // Get all products for category 4243
      const products4243 = await ProductsBigcommerce.query()
        .preload('categories')
        .whereHas('categories', q => q.where('category_id', 4243))
        .where('is_visible', true)
        .limit(600)
        .exec()

      const formattedProducts4243 = await ProductService.formatProducts(products4243)
      await ProductCacheService.updateCache(4243, formattedProducts4243)
      this.logger.info('Cache generated for category 4243')

      this.logger.success('Special products cache generated successfully!')
    } catch (error) {
      this.logger.error('Error generating special products cache:', error)
    }
  }
} 