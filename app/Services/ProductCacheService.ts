import * as fs from 'fs'
import * as path from 'path'
import Env from '@ioc:Adonis/Core/Env'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
import ProductService from './ProductService'

class ProductCacheService {
  private static readonly CACHE_DIR =
    Env.get('NODE_ENV') === 'production'
      ? path.join(process.cwd(), 'storage', 'cache')
      : path.join(__dirname, '..', '..', 'storage', 'cache')
  private static readonly CACHE_DURATION = 10 * 60 * 1000 // 10 minutos en milisegundos
  private static updateInProgress: { [key: string]: boolean } = {}

  static isSpecialCategory(categoryId: string | number): boolean {
    // Ahora todas las categorías son tratadas como especiales para el caché
    return true
  }

  static async getCachedProducts(categoryId: string | number): Promise<any[] | null> {
    try {
      console.log('Environment:', Env.get('NODE_ENV'))
      console.log('Current working directory:', process.cwd())
      console.log('Using cache directory:', this.CACHE_DIR)

      const cacheFile = this.getCacheFilePath(categoryId)
      console.log('Checking cache file:', cacheFile)
      console.log('Cache directory exists:', fs.existsSync(this.CACHE_DIR))

      if (!fs.existsSync(cacheFile)) {
        console.log('Cache file does not exist')
        return null
      }

      const stats = fs.statSync(cacheFile)
      const fileAge = Date.now() - stats.mtimeMs
      console.log('Cache file age:', fileAge, 'ms')
      console.log('Cache duration:', this.CACHE_DURATION, 'ms')

      if (fileAge > this.CACHE_DURATION) {
        console.log('Cache expired, age:', fileAge, 'ms')
        // Iniciar actualización en segundo plano si no está en progreso
        if (!this.updateInProgress[categoryId.toString()]) {
          this.updateCacheInBackground(categoryId)
        }
        // Devolver los datos expirados mientras se actualiza
        const data = fs.readFileSync(cacheFile, 'utf-8')
        const cachedData = JSON.parse(data)
        console.log('Returning expired cache with', cachedData.length, 'products while updating')
        return cachedData
      }

      const data = fs.readFileSync(cacheFile, 'utf-8')
      const cachedData = JSON.parse(data)
      console.log('Cache found with', cachedData.length, 'products')
      return cachedData
    } catch (error) {
      console.error('Error reading cache:', error)
      return null
    }
  }

  static async updateCache(categoryId: string | number, products: any[]): Promise<void> {
    try {
      if (!fs.existsSync(this.CACHE_DIR)) {
        console.log('Creating cache directory:', this.CACHE_DIR)
        fs.mkdirSync(this.CACHE_DIR, { recursive: true })
      }

      const cacheFile = this.getCacheFilePath(categoryId)
      console.log('Updating cache file:', cacheFile)
      console.log('Number of products to cache:', products.length)

      const data = JSON.stringify(products)
      console.log('Cache data size:', data.length, 'bytes')

      // Escribir en un archivo temporal primero
      const tempFile = `${cacheFile}.tmp`
      fs.writeFileSync(tempFile, data)

      // Renombrar el archivo temporal al archivo final (operación atómica)
      fs.renameSync(tempFile, cacheFile)

      console.log('Cache updated successfully for category:', categoryId)
      console.log('Cache will expire in:', this.CACHE_DURATION / 1000, 'seconds')
    } catch (error) {
      console.error('Error updating cache:', error)
      throw error
    }
  }

  private static async updateCacheInBackground(categoryId: string | number): Promise<void> {
    const categoryIdStr = categoryId.toString()

    // Evitar actualizaciones simultáneas
    if (this.updateInProgress[categoryIdStr]) {
      console.log('Update already in progress for category:', categoryId)
      return
    }

    this.updateInProgress[categoryIdStr] = true

    try {
      console.log('Starting background cache update for category:', categoryId)

      // Obtener productos actualizados
      const allProductsQuery = ProductsBigcommerce.query()
        .preload('categories')
        .whereHas('categories', q => q.where('category_id', categoryId))
        .where('is_visible', true)
        .orderBy('sort_order', 'asc')
        .limit(650)

      const allProducts = await allProductsQuery.exec()
      console.log('Fetched', allProducts.length, 'products for category:', categoryId)

      const allFormattedProducts = await ProductService.formatProducts(allProducts)
      console.log('Products formatted, updating cache')

      // Actualizar caché
      await this.updateCache(categoryId, allFormattedProducts)
      console.log('Background cache update completed for category:', categoryId)
    } catch (error) {
      console.error('Error in background cache update:', error)
    } finally {
      this.updateInProgress[categoryIdStr] = false
    }
  }

  private static getCacheFilePath(categoryId: string | number): string {
    return path.join(this.CACHE_DIR, `products_${categoryId}.json`)
  }
}

export default ProductCacheService
