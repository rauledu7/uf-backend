import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import MercadoPagoService from 'App/Services/MercadoPagoService'
import Env from '@ioc:Adonis/Core/Env'
import MailchimpService from 'App/Services/MailchimpService'
import PaymentColombiaService from 'App/Services/PaymentColombiaServices'
import BigcommerceService from 'App/Services/BigcommerceService'

export default class PaymentsColombiaController {
  constructor(
    private readonly mercadopago = new MercadoPagoService(),
    private readonly paymentColombia = new PaymentColombiaService()
  ) {}

  public async createPayment({ response, params }: HttpContextContract) {
    try {
      let { order_id }: Record<string, string> = params
      let order_number = order_id.slice(1)

      const payment = await this.mercadopago.createOrderPay(order_number, order_id)

      //TODO: Envío de datos del cliente a Mailchimp
      await MailchimpService.addContact(Number(order_number))
      await MailchimpService.addContact(Number(order_number), Env.get('MAILCHIMP_AUDIENCIA'))

      response.status(200).json(payment)
    } catch (error) {
      console.log(error.message)
      response.status(400).json({ Error: error.message })
    }
  }

  public async failurePayment({ response, params, request }: HttpContextContract) {
    const { status, payment_id, payment_type }: Record<string, string> = request.all()

    let { order_id }: Record<string, string> = params
    order_id = order_id.slice(1)
    try {
      await this.paymentColombia.failedPayment(order_id, 'mercadopago')

      console.log({
        message: 'Mercadopago orden rechazada',
        id_payment: payment_id,
        order: order_id,
        status: status,
        method: payment_type
      })
      response.redirect(`${Env.get('URL_SITE')}/co/purchase_error/`)
    } catch (error) {
      response.status(400).json({ Error: error.message })
    }
  }

  public async pendingPayment({ response, request }: HttpContextContract) {
    console.log('pago pendiente')
    console.log(request.all())
    const { payment_id } = request.all()

    /*{"collection_id":"1316584858","collection_status":"pending","payment_id":"1316584858","status":"pending","external_reference":"393","payment_type":"ticket","merchant_order_id":"14833938036","preference_id":"1554252204-ceafe93b-4a58-4a41-8cc1-aaa4369b32d7","site_id":"MCO","processing_mode":"aggregator","merchant_account_id":"null"}*/
    const result = await this.paymentColombia.pendingPayment(payment_id)
    console.log(result)
    response.redirect(`${Env.get('URL_SITE')}`)
  }

  public async succesPayment({ response, params, request }: HttpContextContract) {
    let { order_id } = params
    order_id = order_id.slice(1)
    console.log('información de pago emitida por mercadopago: ', request.all())

    try {
      //TODO: Se busca el status actual de la orden, si está pagado se detiene el proceso
      let validateStatusOrder = await BigcommerceService.getOrderById(order_id)
      if (validateStatusOrder.status_id == 11) {
        return { status: 200, message: `This order ${order_id} has already been processed` }
      }
      const { payment_id } = request.all()
      console.log(`Orden ${order_id} pagada, Id de pago mercadolibre: ${payment_id}`)

      const { status, status_detail, payment_type_id, payment_method_id } = await this.mercadopago.confirmPayment(
        payment_id
      )
      console.log(`Estado: ${status}|${status_detail} tipo de metodo de pago: ${payment_type_id}|${payment_method_id}`)

      if (status == 'approved' || status_detail == 'accredited') {
        setImmediate(async () => {
          try {
            await this.paymentColombia.successfultPayment(order_id, payment_type_id, String(payment_id))
            console.log('✅ Payment processed successfully')
          } catch (error) {
            console.error('❗Error processing payment:', error)
          }
        })
      }
      response.redirect(`${Env.get('URL_SITE')}/co/purchase_confirmation?session=${order_id}`)
    } catch (error) {
      console.log(error)
      response.status(500).json({ Error: true, type: error })
    }
  }

  public async notifications({ request }: HttpContextContract) {
    console.log('notificacion de pago')
    console.log(JSON.stringify(request.body()))
    try {
      let requestData = request.all()
      let { action } = requestData
      let id = requestData['data.id']

      if (action == 'payment.updated' || action == 'payment.created') {
        return await this.paymentColombia.pendingPayment(id)
      } else {
        return
      }
    } catch (error) {
      console.error(error)
      return error
    }
  }

  public async verifyPayment({ params }: HttpContextContract) {
    const { order } = params

    return await this.mercadopago.verifyStatusPayment(order)
  }
  public async notificationsBold({ request }: HttpContextContract) {
    console.log('notificacion de pago Bold')
    console.log(request.body())
    try {
      let infoPayment = request.body()
      if (infoPayment.status === 'APPROVED') {
        const order_id = infoPayment.details.order_id
        const payment_type_id = infoPayment.details.payment_type_id
        const payment_id = infoPayment.details.payment_method_id
        await this.paymentColombia.successfultPayment(order_id, payment_type_id, String(payment_id))
        return { status: 'success', data: infoPayment }
      }
      return { status: 'void', data: infoPayment }
    } catch (error) {
      console.error(error)
      return error
    }
  }
}
