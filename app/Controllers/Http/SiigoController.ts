import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import SiigoService from 'App/Services/SiigoService'
import Env from '@ioc:Adonis/Core/Env'

export default class SiigoController {
  public async sendDataOrder(ctx: HttpContextContract) {
    const { orderId } = ctx.params
    const { method } = ctx.request.all()
    const payment_type = method == 'credit_card' ? Env.get('SIIGO_ID_CREDITO') : Env.get('SIIGO_ID_DEBITO')

    return await SiigoService.create_docs(orderId, payment_type)
  }
  public async createInvoiceBulk(ctx: HttpContextContract) {
    const bodyData = ctx.request.body()

    const success: any = []
    const faileds: any = []
    const payment_type = Env.get('SIIGO_ID_DEBITO') || Env.get('SIIGO_ID_CREDITO')
    for (const orderNumber of bodyData.data) {
      const createInvoice = await SiigoService.create_docs(orderNumber, payment_type)
      if (createInvoice.status == 400) {
        faileds.push({ order_id: orderNumber, data: createInvoice })
      } else {
        success.push({ order_id: orderNumber, data: createInvoice })
      }
    }
    return { success, faileds }
  }
}
