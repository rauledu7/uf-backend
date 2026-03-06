//import Env from '@ioc:Adonis/Core/Env'
import { ProcessPaymentInterfaceCO } from 'App/Interfaces/Payments/ProcessPaymentInterface'
import MercadoPagoService from './MercadoPagoService'
import FullpiService from './FullpiService'
import OrdersController from 'App/Controllers/Http/OrdersController'
import EmailService from './EmailService'
import ProcesOrder from 'App/Mailers/ProcesOrder'
import SacOrder from 'App/Mailers/SacOrder'
//import SiigoService from './SiigoService'
import BigcommerceService from './BigcommerceService'
import ReportSaleService from 'App/Services/ReportSale/ReportSaleService'
import MailchimpService from './MailchimpService'
import AlegraService from './Alegra/AlegraService'
import AlertWarningService from './AlertWarningService'

export default class PaymentColombiaService implements ProcessPaymentInterfaceCO {
  constructor(
    private readonly mercadopago = new MercadoPagoService(),
    private readonly orderController = new OrdersController(),
    protected readonly alegraService = new AlegraService()
  ) {}

  public async successfultPayment(order_id: string, type_method: string, payment_id: string) {
    try {
      let orderInfo = await BigcommerceService.getOrderById(order_id)
      // Se busca el status actual de la orden, si está pagado se detiene el proceso
      if (orderInfo.status_id == 11) {
        return
      }

      // Envío de datos a Fullpi
      const fullpi = await FullpiService.setOrder(order_id)
      console.log('datos Fullpi : ' + JSON.stringify(fullpi))
      const isServerError = fullpi && fullpi.status === 500
      const hasNoOrders = fullpi?.message?.orders === undefined
      const hasFailedOrders = fullpi?.message?.orders?.failed?.length > 0
      const hasValidationError =
        hasFailedOrders && !fullpi?.message?.orders?.failed[0]?.info?.validation?.idOrden?.includes('already')

      if ((isServerError && hasNoOrders) || hasValidationError) {
        await AlertWarningService.postMailingWarningShipping(orderInfo)
      }
      //Actualizar estado de la orden en bigcommerce
      const status = 11 // Awaiting Fullfillment
      await this.orderController.update_order(order_id, status, type_method, payment_id)
      // Envío de correo
      const body_email = await EmailService.payloadEmail(order_id)
      await new ProcesOrder(body_email).send()
      await new SacOrder(body_email).send()

      // // Envío de datos a siigo
      // let siigo = await SiigoService.create_docs(order_id, payment_method)
      // console.log({ 'datos siigo': JSON.stringify(siigo) })

      // if (siigo.status == 200) {
      //   await BigcommerceService.setMetafieldByOrder({ id: order_id }, String(siigo.message.id), 'ct_order_id', 'order_id')
      // }
      // creación de factura en Alegra
      let alegraInvoice = await this.alegraService.createDocs(Number(order_id))
      console.log({ 'respuesta de creación de factura alegra': JSON.stringify(alegraInvoice) })
      if (alegraInvoice.status !== 200) {
        await AlertWarningService.postMailingWarningInvoice(orderInfo)
      }
      //Envío de datos google sheets
      const reportSaleService = new ReportSaleService(order_id)
      await reportSaleService.generateReportAndSendToGoogleSheets()

      // envio a mailchimp para el flujo de reviews
      await MailchimpService.sponsorReview(order_id)

      console.log({ success: true, order: order_id, status: 'Pagado' })
      return { success: true, order: order_id, status: 'Pagado' }
    } catch (error) {
      console.error('Error al procesar el pago: ' + error)
      throw error
    }
  }
  public async failedPayment(order_id: string, type_method: string) {
    try {
      // Se busca el status actual de la orden, si está pagado se detiene el proceso
      let validateStatusOrder = await BigcommerceService.getOrderById(order_id)
      if (validateStatusOrder.status_id == 11) {
        return
      }
      // Actualizar estado de la orden en bigcommerce
      const status = 6 // status cancelled
      return await this.orderController.update_order(order_id, status, type_method)
    } catch (error) {
      throw error
    }
  }
  public async pendingPayment(paymentId: string) {
    try {
      // En esta parte del codigo se llama al metodo confirmPayment para obtener los detalles del pago desde la API de Mercadopago
      const { status, status_detail, payment_type_id, payment_method_id, external_reference } =
        await this.mercadopago.confirmPayment(paymentId)
      const orderID = external_reference.split('-')[1]
      // Pausa de 60 segundos
      await new Promise(resolve => setTimeout(resolve, 60000))

      let validateStatusOrder = await BigcommerceService.getOrderById(orderID)

      // Se busca el status actual de la orden, si está pagado se detiene el proceso
      if (validateStatusOrder.status_id == 11) {
        return { status: 200, message: 'La orden ya fue procesada anteriormente' }
      }

      // si el pedido está cancelado de pago solo se guarda la info en la base de  datos

      if (status == 'rejected' || status == 'cancelled') {
        await this.failedPayment(orderID, payment_method_id)
      }

      if (status == 'approved' && status_detail == 'accredited') {
        await this.successfultPayment(orderID, payment_type_id, paymentId)
      }

      console.log({ estado: status, order: external_reference, method: payment_method_id })
      return { estado: status, order: external_reference, method: payment_method_id }
    } catch (error) {
      throw error
    }
  }
  static async pagoContraEntrega(idOrder, orderController: OrdersController) {
    try {
      let orderInfo = await BigcommerceService.getOrderById(idOrder)
      const fullpi = await FullpiService.setOrder(idOrder)
      console.log('pago contraentrega respuesta fullpi: ', fullpi)
      const isServerError = fullpi && fullpi.status === 500
      const hasNoOrders = fullpi?.message?.orders === undefined
      const hasFailedOrders = fullpi?.message?.orders?.failed?.length > 0
      const hasValidationError =
        hasFailedOrders && !fullpi?.message?.orders?.failed[0]?.info?.validation?.idOrden?.includes('already')

      if ((isServerError && hasNoOrders) || hasValidationError) {
        await AlertWarningService.postMailingWarningShipping(orderInfo)
      }
      const status = 9 // contra-entrega
      const method_order = 'Pago Contraentrega'
      orderController.update_order(idOrder, status, method_order)
      const body_email = await EmailService.payloadEmail(idOrder)
      await new ProcesOrder(body_email).send()
      return await new SacOrder(body_email).send()

      // let siigo = await SiigoService.create_docs(idOrder, Env.get('SIIGO_ID_CONTRAENTREGA')) //cambiar staff notes, obtener metafield document_type id 68
      // console.log('Pago contraentrega respuesta siigo: ', siigo)

      // if (siigo.status == 200) {

      //   BigcommerceService.setMetafieldByOrder(
      //     { id: idOrder },
      //     String(siigo.message.id),
      //     'ct_order_id',
      //     'order_id'
      //   )

      // }
    } catch (error) {
      console.log('Error Orden Contraentrega', { error })
      return { error }
    }
  }
}
