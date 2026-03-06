import { google } from 'googleapis'
// import BigcommerceService from './BigcommerceService'
// import ProductService from './ProductService'
import GeneralService from './GeneralService'
import Env from '@ioc:Adonis/Core/Env'
import Variant from 'App/Models/Variant'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'

class GoogleService {
  private authClient: any
  private content: any

  constructor() {
    this.authClient = null
  }

  public async authGoogleMerchantCenter() {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json',
      scopes: 'https://www.googleapis.com/auth/content'
    })
    this.authClient = await auth.getClient()
    this.content = google.content({ version: 'v2.1', auth: this.authClient })
  }

  /**
   * Método optimizado para crear productos en lotes
   * Procesa hasta 1000 productos por request (límite de Google)
   */
  public async createProductBatch() {
    const startTime = Date.now()

    try {
      console.log('🚀 Iniciando sincronización optimizada con Google Merchant Center...')

      // 1. Obtener productos visibles de ProductsBigcommerce
      const visibleProducts = await ProductsBigcommerce.query().where('is_visible', true).select('product_id')

      console.log(`📦 Total de productos visibles encontrados: ${visibleProducts.length}`)

      if (visibleProducts.length === 0) {
        console.log('⚠️ No se encontraron productos visibles para procesar')
        return { success: 0, failed: 0, total: 0 }
      }

      // 2. Obtener todas las variantes de esos productos
      const productIds = visibleProducts.map(p => p.product_id)
      const variants = await Variant.query()
        .preload('product', query => query.select('description'))
        .whereIn('product_id', productIds)

      console.log(`📦 Total de variantes encontradas: ${variants.length}`)

      if (variants.length === 0) {
        console.log('⚠️ No se encontraron variantes para los productos visibles')
        return { success: 0, failed: 0, total: 0 }
      }

      // 3. Formatear productos usando el servicio especializado
      console.log('🔄 Formateando productos para Google Merchant Center...')
      const products = await GeneralService.formatVariantMerchantCenter(variants)
      console.log(`✅ Productos formateados: ${products.length}`)

      // 3. Formatear en lotes de 1000 (límite de Google)
      const batchSize = 1000
      const batches = this.chunkArray(products, batchSize)

      console.log(`📦 Procesando ${products.length} productos en ${batches.length} lotes`)

      // 4. Procesar lotes en paralelo
      const results = await Promise.allSettled(batches.map((batch, batchIndex) => this.processBatch(batch, batchIndex)))

      // 4. Generar reporte final
      const report = this.generateReport(results, startTime)

      console.log('✅ Sincronización completada exitosamente')
      return report
    } catch (error) {
      console.error('❌ Error en procesamiento por lotes:', error)
      throw error
    }
  }

  /**
   * Procesa un lote de productos ya formateados según especificaciones oficiales de Google
   * Basado en: https://support.google.com/merchants/answer/7052112?hl=es-419
   */
  private async processBatch(products: any[], batchIndex: number) {
    try {
      console.log(`🔄 Procesando lote ${batchIndex + 1} con ${products.length} productos...`)

      // Validar productos
      const validProducts = products.filter(p => this.isProductValidForGoogle(p))
      if (validProducts.length === 0) {
        console.log(`⚠️ Lote ${batchIndex + 1}: Sin productos válidos`)
        return { success: 0, failed: 0, batchIndex, total: products.length }
      }

      // Validar variables de entorno críticas
      const merchantId = Env.get('GOOGLE_MERCHANT_CENTER_ID')
      if (!merchantId) {
        throw new Error('❌ GOOGLE_MERCHANT_CENTER_ID no está definido en las variables de entorno')
      }

      // Preparar petición
      const requestBody = {
        entries: validProducts.map((product, index) => ({
          batchId: batchIndex * 1000 + index,
          merchantId,
          method: 'insert',
          productId: product.id.toString(),
          product: this.formatProductForGoogle(product)
        }))
      }

      // Enviar a Google
      console.log(`📤 Enviando lote ${batchIndex + 1} a Google...`)

      const response = await this.content.products.custombatch({
        merchantId: Env.get('GOOGLE_MERCHANT_CENTER_ID'),
        resource: requestBody
      })

      // Procesar respuesta
      const batchResults = response.data.entries || []
      console.log(`📥 Respuesta de Google: ${batchResults.length} entradas`)

      // DEBUG: Mostrar estructura de respuesta
      if (batchResults.length > 0) {
        console.log('🔍 Primera entrada de respuesta:')
        console.log(JSON.stringify(batchResults[0], null, 2))
      } else {
        console.log('⚠️ Respuesta vacía de Google - NO hay entries')
        console.log('🔍 Respuesta completa:', JSON.stringify(response.data, null, 2))
      }

      const successCount = batchResults.filter(entry => !entry.errors || entry.errors.length === 0).length
      const failedCount = batchResults.length - successCount

      console.log(`✅ Lote ${batchIndex + 1}: ${successCount} exitosos, ${failedCount} fallidos`)

      return {
        success: successCount,
        failed: failedCount,
        batchIndex,
        total: products.length,
        batchResults
      }
    } catch (error) {
      console.error(`❌ Error en lote ${batchIndex + 1}:`, error.message)
      return {
        success: 0,
        failed: products.length,
        batchIndex,
        total: products.length,
        error: error.message
      }
    }
  }

  /**
   * Valida si un producto cumple con los estándares de Google Merchant Center
   * Basado en especificaciones oficiales de Google
   */
  private isProductValidForGoogle(product: any): boolean {
    const errors: string[] = []

    // Validaciones obligatorias según Google
    if (!product.id) {
      errors.push('ID del producto faltante')
    }
    if (!product.title || product.title.length < 3) {
      errors.push(`Título muy corto o faltante (actual: "${product.title}" - longitud: ${product.title?.length || 0})`)
    }
    if (!product.description || product.description.length < 10) {
      errors.push(`Descripción muy corta o faltante (longitud: ${product.description?.length || 0})`)
    }
    if (!product.link || !this.isValidUrl(product.link)) {
      errors.push(`URL del producto inválida: ${product.link}`)
    }
    if (!product.image_link || !this.isValidUrl(product.image_link)) {
      errors.push(`URL de imagen inválida: ${product.image_link}`)
    }
    if (!product.price || !product.price.value || product.price.value <= 0) {
      errors.push(`Precio inválido o faltante: ${product.price?.value}`)
    }
    if (!product.price.currency) {
      errors.push('Moneda faltante')
    }
    if (!product.availability || !['in_stock', 'out_of_stock', 'preorder'].includes(product.availability)) {
      errors.push(`Disponibilidad inválida: ${product.availability}`)
    }
    if (!product.condition || !['new', 'used', 'refurbished'].includes(product.condition)) {
      errors.push(`Condición inválida: ${product.condition}`)
    }

    // Validaciones adicionales recomendadas
    if (product.title && product.title.length > 150) {
      errors.push(`Título muy largo: ${product.title.length} caracteres (máximo 150)`)
    }
    if (product.description && product.description.length > 5000) {
      errors.push(`Descripción muy larga: ${product.description.length} caracteres (máximo 5000)`)
    }

    if (errors.length > 0) {
      console.log(`⚠️ Producto ${product.id} no cumple estándares de Google:`)
      console.log(`   📝 Título: "${product.title}"`)
      console.log(`   🔗 Link: ${product.link}`)
      console.log(`   🖼️ Imagen: ${product.image_link}`)
      console.log(`   💰 Precio: ${product.price?.value} ${product.price?.currency}`)
      console.log(`   📋 Disponibilidad: ${product.availability}`)
      console.log(`   🏷️ Condición: ${product.condition}`)
      console.log(`   ❌ Errores encontrados: ${errors.join(', ')}`)
      console.log('   ---')
      return false
    }

    return true
  }

  /**
   * Formatea un producto según las especificaciones oficiales de Google
   */
  private formatProductForGoogle(product: any) {
    // Los datos ya vienen formateados de GeneralService
    // Solo agregamos campos específicos de Google
    return {
      // Campos obligatorios (ya formateados)
      offerId: product.id.toString(),
      title: product.title,
      description: product.description,
      link: product.link,
      imageLink: product.image_link,
      availability: product.availability,
      price: {
        value: product.price.value,
        currency: product.price.currency
      },
      condition: product.condition,

      // Campos de identificación del feed
      feedLabel: Env.get('COUNTRY_CODE'), // País del ENV + Español (formato válido para Google)
      contentLanguage: 'es',
      targetCountry: Env.get('COUNTRY_CODE'),
      channel: 'online',
      identifierExists: product.identifier_exists || 'no',

      // Campos específicos de Google
      googleProductCategory: this.mapToGoogleCategory(product.product_type),
      brand: this.extractDomainFromUrl(Env.get('URL_SITE'))
    }
  }

  /**
   * Extrae el dominio principal de una URL, eliminando subdominios
   */
  private extractDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname

      // Dividir por puntos y obtener las últimas 2 partes para dominios de 2 niveles
      const parts = hostname.split('.')

      if (parts.length >= 2) {
        // Para dominios como .com.co, .co.uk, etc.
        if (parts[parts.length - 2] === 'com' && parts[parts.length - 1] === 'co') {
          return parts[parts.length - 3] || 'domain'
        }
        // Para dominios estándar como .cl, .co, .com
        return parts[parts.length - 2] || 'domain'
      }

      return 'domain'
    } catch {
      return 'domain'
    }
  }

  /**
   * Valida si una URL es válida
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Mapea categorías de tu ecommerce a categorías oficiales de Google
   * Basado en: https://support.google.com/merchants/answer/6324436
   */
  private mapToGoogleCategory(ecommerceCategory: string): string {
    const categoryMapping: { [key: string]: string } = {
      // Fitness y deportes
      fitness: 'Sporting Goods > Exercise & Fitness',
      deportes: 'Sporting Goods',
      gimnasio: 'Sporting Goods > Exercise & Fitness',
      entrenamiento: 'Sporting Goods > Exercise & Fitness',

      // Ropa deportiva
      ropaDeportiva: 'Apparel & Accessories > Clothing > Athletic Apparel',
      ropaFitness: 'Apparel & Accessories > Clothing > Athletic Apparel',
      zapatosDeportivos: 'Apparel & Accessories > Shoes > Athletic Shoes',

      // Suplementos y nutrición
      suplementos: 'Health & Beauty > Health Care > Nutrition',
      proteina: 'Health & Beauty > Health Care > Nutrition',
      vitaminas: 'Health & Beauty > Health Care > Nutrition',

      // Equipamiento
      equipamiento: 'Sporting Goods > Exercise & Fitness',
      maquinas: 'Sporting Goods > Exercise & Fitness',
      pesas: 'Sporting Goods > Exercise & Fitness',

      // Accesorios
      accesorios: 'Sporting Goods > Exercise & Fitness',
      bebidas: 'Food, Beverages & Tobacco > Beverages',
      ropa: 'Apparel & Accessories > Clothing',
      zapatos: 'Apparel & Accessories > Shoes'
    }

    const normalizedCategory = ecommerceCategory?.toLowerCase().replace(/[^a-z0-9]/g, '-') || ''
    return categoryMapping[normalizedCategory] || 'Sporting Goods > Exercise & Fitness'
  }

  /**
   * Divide un array en lotes del tamaño especificado
   */
  private chunkArray(array: any[], size: number): any[][] {
    const chunks: any[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Genera reporte detallado de la sincronización
   */
  private generateReport(results: PromiseSettledResult<any>[], startTime: number) {
    const totalSuccess = results
      .filter(r => r.status === 'fulfilled')
      .reduce((sum, r) => sum + (r.value?.success || 0), 0)

    const totalFailed = results
      .filter(r => r.status === 'fulfilled')
      .reduce((sum, r) => sum + (r.value?.failed || 0), 0)

    const totalProcessed = results
      .filter(r => r.status === 'fulfilled')
      .reduce((sum, r) => sum + (r.value?.total || 0), 0)

    const duration = Date.now() - startTime

    console.log('\n📊 REPORTE FINAL DE SINCRONIZACIÓN:')
    console.log('='.repeat(50))
    console.log(`✅ Productos exitosos: ${totalSuccess}`)
    console.log(`❌ Productos fallidos: ${totalFailed}`)
    console.log(`📦 Total procesados: ${totalProcessed}`)
    console.log(`🚀 Tiempo total: ${(duration / 1000).toFixed(2)} segundos`)
    console.log(`⚡ Velocidad: ${(totalProcessed / (duration / 1000)).toFixed(2)} productos/segundo`)
    console.log('='.repeat(50))

    return {
      success: totalSuccess,
      failed: totalFailed,
      total: totalProcessed,
      duration,
      speed: (totalProcessed / (duration / 1000)).toFixed(2)
    }
  }

  /**
   * Método original mantenido para compatibilidad
   * @deprecated Usar createProductBatch() en su lugar
   */
  public async createProduct() {
    console.warn('⚠️ Este método está deprecado. Usar createProductBatch() para mejor rendimiento.')
    return this.createProductBatch()
  }
}

export default GoogleService
