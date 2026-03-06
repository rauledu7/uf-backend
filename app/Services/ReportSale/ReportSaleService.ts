import InfoReport from './InfoReport'
import Env from '@ioc:Adonis/Core/Env'
import BigcommerceService from '../BigcommerceService'
import { google } from 'googleapis'
import credentials from '../../../google-sheets.json'
import { JWT } from 'google-auth-library'
import moment from 'moment-timezone'

export default class ReportSaleService {
  report: InfoReport[] = []
  order: string | number

  constructor(order_id: any) {
    this.order = order_id
  }

  private async createReport(order_id: string | number): Promise<void> {
    const iva = Number(Env.get('IVA'))
    const date = new Date()
    const day_week = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const name_day = day_week[date.getDay()]
    const day = date.getDate()
    const dayFormat = `${name_day} ${day}`

    let get_order = BigcommerceService.getOrderById(order_id)
    let get_productsByOrder = BigcommerceService.getProductsByOrder(order_id)
    let [order, productsByOrder] = await Promise.all([get_order, get_productsByOrder])

    let date_created = order.date_created
    date_created = new Date(date_created)
    const day_created = date_created.getDate().toString().padStart(2, '0')
    const month_created = (date_created.getMonth() + 1).toString().padStart(2, '0')
    const year_created = date_created.getFullYear().toString()
    date_created = `${day_created}/${month_created}/${year_created}`

    const orderDetails = {
      client: `${order.billing_address.first_name} ${order.billing_address.last_name}`,
      commune: order.billing_address.city,
      city: order.billing_address.city,
      date_created: date_created,
      month: date.toLocaleDateString('es-ES', { month: 'long' }),
      year: date.getFullYear(),
      day: dayFormat,
      movement_type: 'venta',
      seller: Env.get('MARCA'),
      name_coupon: order.ip_address || null,
      email: order.billing_address.email.toLowerCase(),
      order_id: order.id,
      hours: moment().tz(Env.get('TIME_ZONE')).format('HH')
    }
    const products: any[] = []

    await Promise.all(
      productsByOrder.map(async product => {
        if (product.product_id <= 0) {
          return
        }
        const { name, inventory_tracking } = await BigcommerceService.getProductSingle(product.product_id)
        let price_product_ex_tax =
          Array.isArray(product.applied_discounts) && product.applied_discounts.length > 0
            ? (parseInt(product.price_ex_tax) - parseInt(product.applied_discounts[0].amount)) / (1 + iva)
            : parseInt(product.price_ex_tax) / (1 + iva)
        let price_subtotal_neto =
          Array.isArray(product.applied_discounts) && product.applied_discounts.length > 0
            ? parseInt(product.price_ex_tax) - parseInt(product.applied_discounts[0].amount)
            : product.price_ex_tax
        let price_product_inc_tax =
          Array.isArray(product.applied_discounts) && product.applied_discounts.length > 0
            ? parseInt(product.price_inc_tax) - parseInt(product.applied_discounts[0].amount)
            : parseInt(product.price_inc_tax)
        let tax_product = Math.round(price_product_ex_tax * iva)

        let item_product = {
          name_product: name,
          type: inventory_tracking,
          brand: product.brand || null,
          price_ex_tax: Math.round(price_product_ex_tax).toLocaleString(Env.get('LOCALE_STRING'), {
            minimumFractionDigits: 0
          }),
          price_subtotal_neto: Math.round(price_subtotal_neto).toLocaleString(Env.get('LOCALE_STRING'), {
            minimumFractionDigits: 0
          }),
          price_inc_tax: Math.round(price_product_inc_tax).toLocaleString(Env.get('LOCALE_STRING'), {
            minimumFractionDigits: 0
          }),
          tax: tax_product.toLocaleString(Env.get('LOCALE_STRING'), { minimumFractionDigits: 0 }),

          quantity: product.quantity,
          discount:
            Array.isArray(product.applied_discounts) && product.applied_discounts.length > 0
              ? Math.round(product.applied_discounts[0].amount).toLocaleString(Env.get('LOCALE_STRING'), {
                  minimumFractionDigits: 0
                })
              : 0
        }
        item_product = Object.assign(item_product, orderDetails)
        products.push(item_product)
      })
    )
    if (!order.base_shipping_cost.startsWith('0')) {
      let tax_shipping = Math.round(order.base_shipping_cost * iva)

      let shipping_details = {
        name_product: 'Despacho',
        type: 'servicio de despacho',
        brand: 'envio',
        price_ex_tax: Math.round(order.base_shipping_cost / (1 + iva)).toLocaleString(Env.get('LOCALE_STRING'), {
          minimumFractionDigits: 0
        }),
        price_subtotal_neto: Math.round(order.base_shipping_cost).toLocaleString(Env.get('LOCALE_STRING'), {
          minimumFractionDigits: 0
        }),
        price_inc_tax: Math.round(order.base_shipping_cost).toLocaleString(Env.get('LOCALE_STRING'), {
          minimumFractionDigits: 0
        }),
        tax: tax_shipping.toLocaleString(Env.get('LOCALE_STRING'), { minimumFractionDigits: 0 }),
        quantity: 'N/A',
        discount: 'N/A'
      }

      shipping_details = Object.assign(shipping_details, orderDetails)
      products.push(shipping_details)
    }

    const report = products.map(product => new InfoReport(product))
    this.report = report
  }

  private async sendGoogleSheets(data) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      })

      const client: any = (await auth.getClient()) as unknown as JWT

      const sheets = google.sheets({ version: 'v4' })
      const spreadsheetId = '1xkocD7hs-t4o0WeA2dECLLhSxwZYmqJzriRuRM4nKdU'
      const range = 'A2:T2'

      const values = data.map(report => Object.values(report))

      const resource = {
        values
      }

      const response = await sheets.spreadsheets.values.append({
        auth: client,
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: resource
      })

      return response
    } catch (error) {
      console.error('Error al enviar los datos a Google Sheets:', error)
      return error.message
    }
  }

  public async generateReportAndSendToGoogleSheets() {
    await this.createReport(this.order)
    return this.sendGoogleSheets(this.report)
  }
}
