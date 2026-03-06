import { google } from 'googleapis'
import credentials from '../../../google-sheets.json'
import { JWT } from 'google-auth-library'
import CatalogSafeStock from 'App/Models/CatalogSafeStock'
import Variant from 'App/Models/Variant'
import Env from '@ioc:Adonis/Core/Env'

export default class ReportReserveService {
  private async createReport(products): Promise<any> {
    try {
      const ProductsinReserve: any = await Promise.all(
        products.map(async product => {
          const bpn = await CatalogSafeStock.findBy('product_id', product.product_id)

          // Inicia con el producto padre
          let productEntries = [
            {
              id: product.product_id ?? 'No existe',
              sku: bpn?.sku ?? 'No existe',
              date: product.reserve ?? 'No existe',
              bpn: bpn?.bin_picking_number ?? 'No existe'
            }
          ]

          // Si el producto es una variante, obtenemos sus variantes y las agregamos
          if (product.type === 'variation') {
            const variants = await Variant.query().where('product_id', product.product_id)

            const variantEntries = await Promise.all(
              variants.map(async variant => {
                const variantBpn = await CatalogSafeStock.findBy('product_id', variant.id)
                return {
                  id: product.product_id ?? 'No existe',
                  sku: variant.sku ?? 'No existe',
                  date: product.reserve ?? 'No existe',
                  bpn: variantBpn?.bin_picking_number ?? 'No existe'
                }
              })
            )

            // Concatenamos las variantes con el producto padre
            productEntries = productEntries.concat(variantEntries)
          }

          return productEntries // Devuelve tanto el padre como las variantes
        })
      )

      // Aplanar el array resultante, ya que map() genera arrays anidados
      const flatProducts = ProductsinReserve.flat()

      // Enviar los productos a Google Sheets
      return this.sendGoogleSheets(flatProducts)
    } catch (error) {
      return { success: false, message: 'Error al generar el reporte', error: error.message }
    }
  }

  private async sendGoogleSheets(data) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      })

      const client: any = (await auth.getClient()) as unknown as JWT

      const sheets = google.sheets({ version: 'v4' })
      const spreadsheetId = '1TD2vpzcI9JOucxw2sX7PT0YqZnsUHgagatQgW1rfPaU'
      const range = Env.get('VARIABLE_BRAND') + ' ' + Env.get('COUNTRY') + '!A2:D' // Ajusta el rango según cuántas filas esperes sobrescribir

      const values = data.map(report => Object.values(report))

      const resource = {
        values
      }

      // Usar 'update' en lugar de 'append' para sobrescribir los datos
      const response = await sheets.spreadsheets.values.update({
        auth: client,
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: resource
      })

      return { success: true, message: 'Datos enviados correctamente a Google Sheets', response }
    } catch (error) {
      console.error('Error al enviar los datos a Google Sheets:', error)
      return { success: false, message: 'Error al enviar los datos a Google Sheets', error: error.message }
    }
  }

  public async generateReportAndSendToGoogleSheets(products) {
    return await this.createReport(products)
  }
}
