import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import DoofinderService from 'App/Services/DoofinderService'
export default class DoofinderController {
  public async productsListDoofinder({ response }: HttpContextContract) {
    try {
      const csvContent: string = await DoofinderService.uploadsProductsList()
      response.header('Content-Disposition', 'attachment; filename=productos.csv')
      response.type('text/csv')
      response.send(csvContent)
    } catch (error) {
      response.status(500).json({ status: 'error', type: error.code, message: error.message, stack: error.stack })
    }
  }
  public async ViewCatalogProducts({ response }: HttpContextContract) {
    try {
      const viewProductsList: string = await DoofinderService.getProductList()
      return viewProductsList
    } catch (error) {
      response.status(500).json({ status: 'error', type: error.code, message: error.message, stack: error.stack })
    }
  }
}
