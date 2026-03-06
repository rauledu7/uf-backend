import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import MercadoPagoService from 'App/Services/MercadoPagoService'
// import Env from '@ioc:Adonis/Core/Env'
// import MailchimpService from 'App/Services/MailchimpService'
import PaymentPeruService from 'App/Services/PaymentPeruServices'
import IzipayService from 'App/Services/IzipayServices'
import PowerpayService from 'App/Services/PowerpayServices'
import { PaymentConfirmation } from 'App/Interfaces/Payments/ProcessPaymentInterface'

export default class PaymentsPeruController {
  constructor(
    private readonly mercadopago = new MercadoPagoService(),
    private readonly paymentsPeruService = new PaymentPeruService() // private readonly orderController = new OrdersController()
  ) {}

  // public async createPayment({ response, params }: HttpContextContract) {
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
  //     return error
  //   }
  // }

  public async notificationsMercadopago({ request, response }: HttpContextContract) {
    try {
      console.log('notificacion de pago')
      const data = request.body()
      console.log(data)
      if (data?.details?.status_detail === 'accredited') {
        const processPayment = await this.paymentsPeruService.successfultPayment(data as PaymentConfirmation)
        return response.status(200).json(processPayment)
      }
    } catch (error) {
      return response.status(500).json(error.message)
    }
  }

  public async verifyPayment({ params }: HttpContextContract) {
    const { order } = params
    return await this.mercadopago.verifyStatusPayment(order)
  }

  public async createIziPay({ request, response }: HttpContextContract) {
    const body = request.body()
    const token: any = await IzipayService.createToken(body)
    if (token.code !== 200) {
      return response.internalServerError({ error: token })
    }
    return response.ok({ token: token.response })
  }

  // public async statusIziPay({ request }: HttpContextContract) {
  //   const body = request.body()
  //   const [brand, session_id] = body.transactionId.split('-')
  //   console.log(brand)
  //   const status: any = await IzipayService.statusOrder(body)
  //   if (status.code === '00') {
  //     let bsale = await BsaleService.setBsaleDocsPeru(parseInt(body.orderNumber), session_id, Env.get('PAYMENT_ID_IZIPAY'))
  //     if (bsale.status == 200) {
  //       UrbanoService.setOrder(parseInt(body.orderNumber))
  //       BigcommerceService.setMetafieldByOrder({ id: parseInt(body.orderNumber) }, bsale.message.id, 'ct_order_id', 'order_id')
  //       const OrdersControllerInstance = new OrdersController()
  //       OrdersControllerInstance.update({
  //         params: {
  //           status: Env.get('VERIFY_CODE_STATUS_PAYMENT'),
  //           order_id: parseInt(body.orderNumber),
  //           token: bsale.message.token,
  //           authorizationCode: 0,
  //         },
  //       })
  //       const body_email = await EmailService.payloadEmail(parseInt(body.orderNumber), bsale.message.token)
  //       await new ProcesOrder(body_email).send()
  //       await new SacOrder(body_email).send()
  //     }
  //   }
  //   //TODO: Envío de datos google sheets
  //   const reportSaleService = new ReportSaleService(parseInt(body.orderNumber))
  //   await reportSaleService.generateReportAndSendToGoogleSheets()

  //   //TODO: envio a mailchimp para el flujo de reviews
  //   await MailchimpService.sponsorReview(body.orderNumber)

  //   return status
  //   // if(token.code !== 200){
  //   //   return response.internalServerError({error: token})
  //   // }
  //   // return response.ok({token: token.response})
  // }

  public async createPowerpay({ request, response }: HttpContextContract) {
    const body = request.body()
    const res: any = await PowerpayService.createPay(body)
    if (res.code !== 200) {
      return response.internalServerError({ error: res })
    }
    return response.ok({ url: res.url })
  }

  // public async statusPowerpay({ request, response }: HttpContextContract) {
  //   const body = request.body()
  //   const order = body.id.slice(1, body.id.length)
  //   const session_id = body.id
  //   const { total_inc_tax } = await this.orderController.show({ params: { order_id: order } })
  //   let bsale = await BsaleService.setBsaleDocs(order, session_id, Env.get('PAYMENT_ID_POWERPAY'))
  //   if (bsale.status == 200) {
  //     UrbanoService.setOrder(parseInt(order))
  //     BigcommerceService.setMetafieldByOrder({ id: parseInt(order) }, bsale.message.id, 'ct_order_id', 'order_id')
  //     const OrdersControllerInstance = new OrdersController()
  //     OrdersControllerInstance.update({
  //       params: {
  //         status: Env.get('VERIFY_CODE_STATUS_PAYMENT'),
  //         order_id: parseInt(order),
  //         token: bsale.message.token,
  //         authorizationCode: 0,
  //       },
  //     })
  //     const body_email = await EmailService.payloadEmail(parseInt(order), bsale.message.token)
  //     new ProcesOrder(body_email).send()
  //     new SacOrder(body_email).send()
  //   }
  //   //TODO: Envío de datos google sheets
  //   const reportSaleService = new ReportSaleService(parseInt(order))
  //   await reportSaleService.generateReportAndSendToGoogleSheets()
  //   return response.ok({
  //     order,
  //     method: 'PowerPay',
  //     amount: total_inc_tax,
  //   })
  //   // if(token.code !== 200){
  //   //   return response.internalServerError({error: token})
  //   // }
  //   // return response.ok({token: token.response})
  // }

  public async notificationPowerpay({ request, response }: HttpContextContract) {
    // {
    //   "data": {
    //     "id": "123123",
    //     "amount": "500.00",
    //     "redirection_url": "LinkDeEvaluacion",
    //     "status": "Processed",
    //     "expired_at": "2022-08-27T22:02:00.123456+00:00",
    //     "created_at": "2022-08-27T16:02:00.123456+00:00"
    //     "signature": "11231231...4242dfsf"
    //   }
    // }
    const body = request.body()
    console.log(body)
    return response.ok({ codigo: 200 })
    //   const status : any = await IzipayService.statusOrder(body)
    //   if (status.code === '00') {
    //     let bsale = await BsaleService.setBsaleDocsPeru(
    //       parseInt(body.orderNumber),
    //      //session_id,
    //       Env.get('PAYMENT_ID_IZIPAY')
    //     )
    //     if (bsale.status == 200) {
    //       GetpointService.setOrder(parseInt(body.orderNumber))
    //       BigcommerceService.setMetafieldByOrder(
    //        {id: parseInt(body.orderNumber)},
    //         bsale.message.id,
    //         'ct_order_id',
    //         'order_id'
    //       )
    //       const OrdersControllerInstance = new OrdersController()
    //       OrdersControllerInstance.update({
    //         params: {
    //           status: Env.get('VERIFY_CODE_STATUS_PAYMENT'),
    //           order_id: parseInt(body.orderNumber),
    //           token: bsale.message.token,
    //           authorizationCode: 0,
    //         },
    //       })
    //       const body_email = await EmailService.payloadEmail(parseInt(body.orderNumber), bsale.message.token)
    //       await new ProcesOrder(body_email).send()
    //       await new SacOrder(body_email).send()
    //     }
    //   }
    //   //TODO: Envío de datos google sheets
    //   const reportSaleService = new ReportSaleService(parseInt(body.orderNumber));
    //   await reportSaleService.generateReportAndSendToGoogleSheets()
    //   return status
    //   // if(token.code !== 200){
    //   //   return response.internalServerError({error: token})
    //   // }
    //   // return response.ok({token: token.response})
  }
  public async paymentGiftCard({ params, response }: HttpContextContract) {
    try {
      let { order_id } = params
      order_id = order_id.slice(1)
      const data = {
        details: {
          order_id,
          paymen_type_id: 'Gift Card'
        }
      }
      return await this.paymentsPeruService.successfultPayment(data as any)
    } catch (error) {
      return response.badRequest({ status: error?.status || 400, message: error?.message })
    }
  }
}
