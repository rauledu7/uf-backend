import Env from '@ioc:Adonis/Core/Env'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { tokenForBsale } from 'App/Interfaces/ChannelForBsale'
import { PaymentInfo } from 'App/Interfaces/LinkifyInterface'
import { PaymentConfirmation } from 'App/Interfaces/Payments/ProcessPaymentInterface'
import BigcommerceService from 'App/Services/BigcommerceService'
import LinkifyService from 'App/Services/LinkifyService'
import MercadoPagoService from 'App/Services/MercadoPagoService'
import PaymentChileService from 'App/Services/PaymentChileService'
import TransbankService from 'App/Services/TransbankService'
import axios from 'axios'
import moment from 'moment'
import OrdersController from './OrdersController'

export default class PaymentsChileController {
  constructor(
    private readonly mercadopago = new MercadoPagoService(),
    private readonly paymentsService = new PaymentChileService(),
    private readonly orderController = new OrdersController()
  ) {}
  public async create_webpay({ request }: HttpContextContract) {
    try {
      let params = request.body()
      const payment = await TransbankService.setPayment(params.buy_order, params.session_id, params.amount, params.url)

      return payment
    } catch (error) {
      return { message: error.message }
    }
  }

  public async status_webpay({ request }: HttpContextContract) {
    let params = request.body()
    console.log('respuesta webpay:', params)
    const payment = await TransbankService.getStatusOrder(params.token)
    if (payment.response_code == 0) {
      const order_id = payment.buy_order // numbero de orden
      const cardNumber = payment?.card_detail?.card_number || 'N/A' // 4 ultimos numeros de la tarjeta
      const quotesPayment = payment?.installments_number || 1 // numero de cuotas
      const authorizationCode = payment?.authorization_code || 'N/A' // codigo de autorización transbank

      const paymentData = {
        details: {
          order_id,
          payment_type_id: 'Webpay',
          info: {
            card: cardNumber,
            quotes: quotesPayment,
            method: 'transferencia',
            id: authorizationCode,
            op: 'transbank'
          }
        }
      }
      const dataPayment = await this.paymentsService.successfultPayment(paymentData as any)

      console.log('Resultado del pago en Webpay', dataPayment)
    }

    return payment
  }

  public async getPaymentLinkify({ request, response }: HttpContextContract) {
    console.log(request.method())
    console.log(request.all())
    try {
      const { encoded_data } = request.all()

      const { id } = JSON.parse(encoded_data)
      const session_id = id.slice(1)
      const OrdersControllerInstance = new OrdersController()

      const order = await OrdersControllerInstance.show({ params: { order_id: session_id } })

      if (order.payment_method == Env.get('PAYMENT_METHOD_ALTERNATIVE') && order.status === 'Awaiting Payment') {
        let productsForOrder = await axios.get(
          Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders/' + order.id + '/products',
          {
            headers: {
              'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
              'Content-Type': 'application/json',
              host: 'api.bigcommerce.com'
            }
          }
        )
        let description = productsForOrder.data.map(product => {
          return { name: product.name, quantity: product.quantity }
        })

        description = description
          .map(item => {
            const quantityText = item.quantity > 1 ? 'unidades' : 'unidad'
            return `${item.name} - (${item.quantity}) ${quantityText}`
          })
          .join('\n')

        const res = {
          amount: Number(order.total_inc_tax),
          description, //aqui está la description de la orden
          currency: order.currency_code,
          contact: {
            email: order.billing_address.email,
            rut: order.billing_address.zip
          },
          extra_data: []
        }

        return response.status(200).json(res)
      } else {
        return response.status(400).json({
          message: 'Payment not found'
        })
      }
    } catch (err) {
      return response.status(500).json({ message: err.message })
    }
  }

  public async verifyPaymentLinkify({ request, response }: HttpContextContract) {
    try {
      let paymentResult: any = request.all()
      let { id, action, completeness } = paymentResult
      console.log('Pago Linkify', paymentResult)
      const infoPay = {
        id,
        action,
        completeness
      }
      const order_id = Number(id.slice(1))
      let dataOrder = await BigcommerceService.getOrderById(order_id)

      if (dataOrder.status_id === 11) {
        return `la orden ${order_id} ya fue pagada`
      }
      const CHANNEL_SELLER = tokenForBsale // viene de la carpeta Interface archivo ChannelforBsale.ts este contiene los tokens bsale por marcas
      let { channel_id } = dataOrder
      const channel = CHANNEL_SELLER.filter(elem => elem.channel == channel_id)

      if (action === 'cancellation') {
        const status = 5 // status cancelado
        await this.orderController.update_order(order_id, status, dataOrder.payment_method)
        return response.status(200).json({
          status: 'accepted',
          mesage: 'orden de compra cancelada por tiempo de expiración',
          restart: true
        })
      }

      if (action === 'underpaid') {
        return response.status(200).json({
          status: 'rejected',
          mesage: 'El monto pagado está por debajo del monto de la compra',
          restart: true
        })
      }
      if (channel_id !== 1) {
        await LinkifyService.redirectPaymentLinkify(channel_id, infoPay)
      }

      if (completeness === 'exact' && action === 'notification') {
        if (channel_id === 1) {
          const paymentData = {
            details: {
              order_id,
              payment_type_id: 'Linkify',
              info: {
                card: 'N/A',
                quotes: 1,
                method: 'transferencia',
                id,
                op: 'linkify'
              }
            }
          }
          const dataPayment = await this.paymentsService.successfultPayment(paymentData as any)

          console.log('Resultado del pago en linkify', dataPayment)

          console.log({
            status: 'accepted',
            mesage: 'Pago verificado correctamente',
            redirect: `${channel[0]?.purchase_confirmation}${order_id}`,
            restart: true
          })

          response.status(200).json({
            status: 'accepted',
            mesage: 'Pago verificado correctamente',
            redirect: `${channel[0]?.purchase_confirmation}${order_id}`,
            restart: true
          })
        }
      }
    } catch (error) {
      console.error(error)
      response.status(400).json({ message: error.message })
    }
  }

  public async validateLinkify({ request, response }: HttpContextContract) {
    const body = request.body()

    try {
      let paymentToVerification: PaymentInfo = {
        invoice_type: 'remote',
        invoice_id: String(body.id),
        merchant: Env.get('LINKIFY_ID_ACCOUNT'),
        amount: body.amount,
        description: `PEDIDO ${body.id}`,
        rut: body.rut,
        date: moment().format('DD/MM/YYYY'),
        email: body.email,
        endpoint: Env.get('LINKIFY_URL_INTEGRATION')
      }
      const createValidation = await new LinkifyService().createValidation(paymentToVerification)
      return response.status(200).json(createValidation)
    } catch (error) {
      return response.status(500).json({ error: error.message })
    }
  }
  public async confirmationLinkify({ response, params }: HttpContextContract) {
    try {
      const uuid = params.id

      const linkifyService = new LinkifyService()

      const confirmation = await linkifyService.getValidation(uuid)

      return response.status(200).json(confirmation.status)
    } catch (error) {
      return response.status(500).json({ error: error.message })
    }
  }
  public async notificationsMercadopago({ request, response }: HttpContextContract) {
    try {
      console.log('notificacion de pago')
      const data = request.body()
      console.log(data)
      if (data?.details?.status_detail === 'accredited') {
        const processPayment = await this.paymentsService.successfultPayment(data as PaymentConfirmation)
        return response.status(200).json(processPayment)
      }
    } catch (error) {
      return response.status(500).json(error.message)
    }
  }
  public async verifyPaymentMercadopago({ params }: HttpContextContract) {
    const { order } = params
    return await this.mercadopago.verifyStatusPayment(order)
  }
  public async paymentGiftCard({ params, response }: HttpContextContract) {
    try {
      let { order_id } = params
      order_id = order_id.slice(1)
      const data = {
        details: {
          order_id,
          payment_type_id: 'Gift Card',
          info: {
            card: 'N/A',
            quotes: 1,
            method: 'gift_card',
            id: `${Env.get('VARIABLE_BRAND')}${order_id}`,
            op: 'gift_card'
          }
        }
      }
      return await this.paymentsService.successfultPayment(data as any)
    } catch (error) {
      return response.badRequest({ status: error?.status || 400, message: error?.message })
    }
  }
  // public async createPaymentMercadopago({ response, params }: HttpContextContract) {
  //   try {
  //     let { order_id }: Record<string, string> = params
  //     let order_number = order_id.slice(1)

  //     const payment = await this.mercadopago.createOrderPay(order_number, order_id)

  //     //TODO: Envío de datos del cliente a Mailchimp
  //     await MailchimpService.addContact(Number(order_number))
  //     await MailchimpService.addContact(Number(order_number), Env.get('MAILCHIMP_AUDIENCIA'))

  //     response.status(200).json(payment)
  //   } catch (error) {
  //     console.log(error.message)
  //     response.status(400).json({ status: 'error', code: error.code, error: error.message, stack: error.stack })
  //   }
  // }

  // public async succesPaymentMercadopago({ response, params, request }: HttpContextContract) {
  //   let { order_id } = params
  //   const session_id = order_id
  //   order_id = order_id.slice(1)
  //   //console.log(request.all())
  //   try {
  //     const { payment_id } = request.all()
  //     console.log(`Orden ${order_id} pagada, Id de pago mercadolibre: ${payment_id}`)

  //     const { status, status_detail, payment_type_id, payment_method_id } = await this.mercadopago.confirmPayment(payment_id)

  //     // payment_type_id= credit_card / debit_card  payment_method_id= master/visa
  //     console.log(`Estado: ${status}|${status_detail} tipo de metodo de pago: ${payment_type_id}|${payment_method_id}`)

  //     if (status == 'approved' || status_detail == 'accredited') {
  //       await this.paymentsService.successfultPayment(order_id, session_id, payment_type_id)
  //     }

  //     response.redirect(`${Env.get('URL_SITE')}/cl/purchase_confirmation?purchase=${order_id}`)
  //   } catch (error) {
  //     console.error(error)
  //     return error
  //   }
  // }

  // public async failurePaymentMercadopago({ response, params, request }: HttpContextContract) {
  //   const { status, payment_id, payment_type }: Record<string, string> = request.all()
  //   console.log(request.all())

  //   let { order_id }: Record<string, string> = params
  //   order_id = order_id.slice(1)
  //   try {
  //     await this.paymentsService.failedPayment(order_id, 'mercadopago')

  //     console.log({
  //       message: 'Mercadopago orden rechazada',
  //       id_payment: payment_id,
  //       order: order_id,
  //       status: status,
  //       method: payment_type,
  //     })
  //     response.redirect(`${Env.get('URL_SITE')}/cl/purchase_error/`)
  //   } catch (error) {
  //     return error
  //   }
  // }
}
