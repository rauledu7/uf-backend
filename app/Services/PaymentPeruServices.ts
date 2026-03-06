import { PaymentConfirmation, ProcessPaymentInterface } from 'App/Interfaces/Payments/ProcessPaymentInterface'
import OrdersController from 'App/Controllers/Http/OrdersController'
import BsaleService from 'App/Services/BsaleService'
import BigcommerceService from './BigcommerceService'
import UrbanoService from './UrbanoServices'
import EmailService from './EmailService'
import ProcesOrder from 'App/Mailers/ProcesOrder'
import SacOrder from 'App/Mailers/SacOrder'
import ReportSaleService from './ReportSale/ReportSaleService'
import MailchimpService from './MailchimpService'
import AlertWarningService from './AlertWarningService'

export default class PaymentPeruService implements ProcessPaymentInterface {
  constructor(private readonly orderController = new OrdersController()) {}

  public async successfultPayment(data: PaymentConfirmation) {
    try {
      const order_id = data.details.order_id
      const paymentMethod = data.details.payment_type_id
      //TODO: Se busca el status actual de la orden, si está pagado se detiene el proceso
      let orderInfo = await BigcommerceService.getOrderById(order_id)
      console.log('📝 Información de la orden', orderInfo)

      if (orderInfo.status_id == 11) {
        return { status: 200, message: `El pedido ${order_id} ya fue procesado anteriormente` }
      }

      //TODO: Envío de datos al facturador
      const bsale = await BsaleService.setBsaleDocs(order_id)
      console.log('Respuesta de bsale: ' + JSON.stringify(bsale))
      if (bsale?.message?.error) {
        await AlertWarningService.postMailingWarningInvoice(orderInfo)
      }

      if (bsale.status == 200) {
        BigcommerceService.setMetafieldByOrder({ id: order_id }, bsale.message.id, 'ct_order_id', 'order_id')
        //TODO: Actualizar estado de la orden en bigcommerce
        const status = 11 // Awaiting Fullfillment
        this.orderController.update_order(order_id, status, paymentMethod, bsale.message.urlPdf)
      }

      //TODO: Envío de datos a la empresa de envío
      const urbano = await UrbanoService.setOrder(order_id as string)
      if (urbano === undefined || urbano?.success !== true) {
        await AlertWarningService.postMailingWarningShipping(orderInfo)
      }
      console.log('Respuesta de Urbano: ' + JSON.stringify(urbano))

      //TODO: Envío de correo

      const body_email = await EmailService.payloadEmail(order_id, bsale.message.token)
      await new ProcesOrder(body_email).send()
      await new SacOrder(body_email).send()

      //TODO: Envío de datos google sheets
      const reportSaleService = new ReportSaleService(order_id)
      await reportSaleService.generateReportAndSendToGoogleSheets()

      //TODO: envio a mailchimp para el flujo de reviews
      await MailchimpService.sponsorReview(order_id)

      console.log({ success: true, order: order_id, status: 'Pagado' })
      return { success: true, order: order_id, status: 'Pagado' }
    } catch (error) {
      console.error('Error al procesar el pago: ' + error)
      throw Error
    }
  }
}
