import Env from '@ioc:Adonis/Core/Env'
import OrdersController from 'App/Controllers/Http/OrdersController'
import { PaymentConfirmation, ProcessPaymentInterface } from 'App/Interfaces/Payments/ProcessPaymentInterface'
import ProcesOrder from 'App/Mailers/ProcesOrder'
import SacOrder from 'App/Mailers/SacOrder'
import BsaleService from 'App/Services/BsaleService'
import AlertWarningService from './AlertWarningService'
import BigcommerceService from './BigcommerceService'
import EmailService from './EmailService'
import GetpointService from './GetpointService'
import MailchimpService from './MailchimpService'
import ReportSaleService from './ReportSale/ReportSaleService'
export default class PaymentChileService implements ProcessPaymentInterface {
  protected readonly omsIsActive = Env.get('OMS_ACTIVE') === 'true' ? true : false

  constructor(private readonly orderController = new OrdersController()) {}

  public async successfultPayment(data: PaymentConfirmation) {
    try {
      // Se busca el status actual de la orden, si está pagado se detiene el proceso
      const order_id = data.details.order_id
      const paymentMethod = data.details.payment_type_id
      let orderInfo = await BigcommerceService.getOrderById(order_id)
      console.log(`Información de la orden ${order_id}`, orderInfo)
      const products = await BigcommerceService.getProductsByOrder(order_id)
      console.log(`Productos de la orden ${order_id}`, products)
      if (orderInfo.status_id === 11) {
        return { status: 200, message: `El pedido ${order_id} ya fue procesado anteriormente` }
      }
      // caso de uso: valida si el pedido corresponde a una compra de giftcard
      const name = products[0].name?.toLowerCase().replace(/\s+/g, ' ').trim() || ''
      const orderBuyOnlyGiftcard = products.length === 1 && name.includes('gift card')
      console.log(`Orden ${order_id} es compra de solo giftcard: `, orderBuyOnlyGiftcard)
      // caso de uso: valida si el pedido es pagado con giftcard
      const isGiftcard = paymentMethod.toLowerCase().includes('gift')
      console.log(`Orden ${order_id} es pagada con giftcard: `, isGiftcard)

      let bsale
      if (!this.omsIsActive) {
        // caso de uso: si el pedido no es una compra de solo giftcard...se envía a bsale
        if (!orderBuyOnlyGiftcard) {
          const getpoint = await GetpointService.setOrder(order_id)
          console.log('respuesta getpoint', getpoint)
          // verificar si hubo error en el envio de datos de la orden  a getpoint
          if (typeof getpoint === 'object' && getpoint !== null && 'message' in getpoint) {
            if (
              getpoint?.message?.resultado === 'ERROR' &&
              !getpoint?.message?.descripcion?.toLowerCase().includes('existe')
            ) {
              await AlertWarningService.postMailingWarningShipping(orderInfo)
            }
          }

          bsale = await BsaleService.setBsaleDocs(order_id, isGiftcard)
          console.log('Respuesta bsale: ', bsale)
          // verificar si hubo error en el envio de datos a bsale
          if (bsale?.message?.error) {
            await AlertWarningService.postMailingWarningInvoice(orderInfo)
          }
          await BigcommerceService.setMetafieldByOrder({ id: order_id }, bsale.message.id, 'ct_order_id', 'order_id')
        }
      }
      const details = data?.details?.info ? JSON.stringify(data?.details?.info) : paymentMethod

      // si es compra de solo giftcard, se actualiza el status a 1 (PENDIENTE), si no, se actualiza a 11 (Awaiting Fulfillment)
      const status = orderBuyOnlyGiftcard ? 1 : 11 // Awaiting Fulfillment
      //console.log('info payment',details)

      const updateStatusOrder = await this.orderController.update_order(
        order_id,
        status,
        details,
        orderBuyOnlyGiftcard ? `Compra de ${products[0]?.name ?? 'Giftcard'}` : bsale?.message?.token
      )
      console.log('respuesta update order', updateStatusOrder)
      if (updateStatusOrder && updateStatusOrder?.status >= 400) {
        const retryUpdateOrder = await this.orderController.update_order(
          order_id,
          status,
          paymentMethod,
          bsale?.message?.token
        )
        console.log('respuesta de reintento update order', retryUpdateOrder)
      }

      // Envío de correo

      const body_email = await EmailService.payloadEmail(
        order_id,
        orderBuyOnlyGiftcard ? undefined : bsale.message.token
      )
      const email = await new ProcesOrder(body_email).send()
      console.log('respuesta email', email)
      const sac = await new SacOrder(body_email).send()
      console.log('respuesta sac', sac)

      // Envío de datos google sheets

      const reportSaleService = new ReportSaleService(order_id)
      console.log('reportSaleService', reportSaleService)
      const googleReport = await reportSaleService.generateReportAndSendToGoogleSheets()
      console.log('respuesta googleReport', googleReport)

      //envio a mailchimp para el flujo de reviews
      const sponsorReview = await MailchimpService.sponsorReview(order_id)
      console.log('respuesta mailchimp sponsorReview', sponsorReview)

      console.log({ status: 200, order: order_id, message: 'Pago procesado correctamente' })
      return { status: 200, order: order_id, message: 'Pago procesado correctamente' }
    } catch (error) {
      console.error('Error al procesar el pago: ' + error)
      throw Error
    }
  }
}
