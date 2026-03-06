import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import NostoService from 'App/Services/Nosto/NostoService'

export default class NostosController {
  constructor(private nostoService = new NostoService()) {}
  public async showCatalogProduct({ response }: HttpContextContract) {
    try {
      const productsList = await this.nostoService.showCatalogProductsNosto()
      return response.ok(productsList)
    } catch (error) {
      console.error('Error al obtener productos:', error)
      return response
        .status(400)
        .send({ error: error.name, message: error.message, code: error.code, stack: error.stack })
    }
  }
  public async indexCatalog({ response }: HttpContextContract) {
    try {
      const productsList = await this.nostoService.indexCatalogProductsNosto()

      return response.ok(productsList)
    } catch (error) {
      console.error('Error al obtener productos:', error)
      return response.status(400).json({
        error: 'Error al cargar los productos en Nosto',
        message: error.message,
        code: error.code,
        stack: error.stack,
        data: error.response.data
      })
    }
  }
}
