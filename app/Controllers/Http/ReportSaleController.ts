import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import ReportSaleService from 'App/Services/ReportSale/ReportSaleService'

export default class ReportSaleController {
  public async viewReport({ params }: HttpContextContract) {
    const { orderId } = params
    const reportSaleService = new ReportSaleService(orderId)

    try {
      const docsGoogle = await reportSaleService.generateReportAndSendToGoogleSheets()

      return docsGoogle //'Reporte enviado exitosamente a Google Sheets';
    } catch (error) {
      return error.message
    }
  }
}
