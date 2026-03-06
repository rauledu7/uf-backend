import ProductCatalog from './ProductCatalog'
import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
export default class NostoService extends ProductCatalog {
  private readonly API_NOSTO: string = Env.get('URL_NOSTO')
  private authorization = {
    headers: {
      Authorization: `Basic ${Buffer.from(`:${process.env.TOKEN_PRODUCTS_NOSTO}`).toString('base64')}`,
      'Content-Type': 'application/json'
    }
  }

  constructor() {
    super()
  }

  public async showCatalogProductsNosto() {
    try {
      return await this.createCatalog()
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  public async indexCatalogProductsNosto() {
    try {
      const getCatalogProducts = await this.showCatalogProductsNosto()
      const length = getCatalogProducts.length

      // Determinar el tamaño del chunk basado en la longitud
      const chunkSize = length <= 300 ? length : Math.ceil(length / Math.min(5, Math.ceil(length / 300)))

      const totalChunks = Math.ceil(length / chunkSize) // Total de partes

      for (let i = 0; i < totalChunks; i++) {
        // Obtener el chunk actual
        const chunk = getCatalogProducts.slice(i * chunkSize, (i + 1) * chunkSize)

        // Enviar el chunk
        const uploadCatalogProducts = await axios.post(this.API_NOSTO, chunk, this.authorization)

        if (uploadCatalogProducts?.status !== 200) {
          throw new Error(`Error uploading data products in nosto ${i + 1}: ${uploadCatalogProducts.status}`)
        }
      }

      return { status: 200, data: getCatalogProducts }
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}
