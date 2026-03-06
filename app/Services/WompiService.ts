import Env from '@ioc:Adonis/Core/Env'
import { createHash } from 'crypto'
import BigcommerceService from './BigcommerceService'
// import moment from 'moment-timezone'
import { createTransaction, transactionStatus, typeStatus } from 'App/Interfaces/Wompi/TransactionInterface'
import axios from 'axios'
import OrdersController from 'App/Controllers/Http/OrdersController'
import FullpiService from './FullpiService'
//import SiigoService from './SiigoService'
import ReportSaleService from './ReportSale/ReportSaleService'
import MailchimpService from './MailchimpService'
import EmailService from './EmailService'
import ProcesOrder from 'App/Mailers/ProcesOrder'
import SacOrder from 'App/Mailers/SacOrder'
import AlegraService from './Alegra/AlegraService'

export default class WompiService {
  private apiWompi = Env.get('NODE_ENV') === 'development' ? Env.get('URL_WOMPI_TEST') : Env.get('URL_WOMPI_PROD')
  private publicKey =
    Env.get('NODE_ENV') === 'development' ? Env.get('PUBLIC_KEY_WOMPI_TEST') : Env.get('PUBLIC_KEY_WOMPI_PROD')
  private privateKey =
    Env.get('NODE_ENV') === 'development' ? Env.get('PRIVATE_KEY_WOMPI_TEST') : Env.get('PRIVATE_KEY_WOMPI_PROD')
  private integrityKey =
    Env.get('NODE_ENV') === 'development' ? Env.get('KEY_INTEGRITY_WOMPI_TEST') : Env.get('KEY_INTEGRITY_WOMPI_PROD')
  private currency = Env.get('LOCATION') == 'COLOMBIA' && Env.get('CURRENCY_ID')

  // este metodo es para verificar los pagos y de acuerdo el estado del pago deriva al metodo de procesamiento correspondiente en paymentColombiaService.
  public async VerifyPayment(transactionId: string) {
    try {
      const options = {
        method: 'GET',
        url: `${this.apiWompi}${transactionId}`,
        headers: {
          'Content-Type': 'application/json',
          BearerPublicKey: this.publicKey,
          BearerPrivateKey: this.privateKey
        }
      }
      const payment = await axios.request(options)
      return payment.data.data
    } catch (error) {
      return {
        status: error.response.status,
        message: error.response.statusText,
        data: error.response.data
      }
    }
  }

  // este metodo obtiene los datos necesarios para crear el pago, y codifica en sha256 los datos de acuerdo a la documentación de wompi.
  public async preparePayment(orderId: number) {
    try {
      let [orderInfo, shippingInfo] = await Promise.all([
        BigcommerceService.getOrderById(orderId),
        BigcommerceService.getShippingAddress(orderId)
      ])
      if (!orderInfo) {
        throw new Error('Order not found')
      }
      if (!shippingInfo) {
        throw new Error('shipping information not found')
      }

      let { total_inc_tax } = orderInfo
      total_inc_tax = Math.round(total_inc_tax * 100)

      const {
        first_name,
        last_name,
        street_1: billingAddress,
        city: billingCity,
        state: billingState,
        zip,
        phone,
        email
      } = orderInfo.billing_address

      const { street_1: shippingAddress, city: shippingCity, state: shippingState } = shippingInfo

      // const date = moment()
      //   .tz(Env.get('TIME_ZONE'))
      //   .add(10, 'minutes')
      //   .format('ddd, DD MMM YYYY HH:mm:ss ZZ')
      const dataDetails = `${Env.get('VARIABLE_BRAND')}-${orderId}${total_inc_tax}${this.currency}${this.integrityKey}`
      const encodeDataDetails = this.encodeDataPayment(dataDetails)
      // const redirectUrl = `${Env.get('API_URL')}/wompi/payments/`

      const infoPayment: createTransaction = {
        currency: this.currency,
        amountInCents: total_inc_tax,
        reference: `${Env.get('VARIABLE_BRAND')}-${orderId}`,
        publicKey: this.publicKey,
        signature: { integrity: encodeDataDetails },
        // redirectUrl: 'https://transaction-redirect.wompi.co/check',//redirectUrl,
        // expirationTime: date,
        customerData: {
          email: email,
          fullName: `${first_name} ${last_name}`,
          phoneNumber: phone,
          phoneNumberPrefix: Env.get('AREA_CODE'),
          legalId: zip,
          legalIdType: 'OTHER'
        },
        shippingAddress: {
          addressLine1: shippingAddress || billingAddress,
          city: shippingCity || billingCity,
          phoneNumber: phone,
          region: shippingState || billingState,
          country: Env.get('COUNTRY_CODE')
        }
      }

      return infoPayment
    } catch (error) {
      const errorResponse = {
        status: error.status || 404,
        message: error.message,
        data: error.name || undefined,
        details: error.stack || undefined
      }
      return errorResponse
    }
  }

  //metodo para codificar los datos de pago pasados por el metodo preparePayment
  private encodeDataPayment(paymentDetails: string): string | void {
    const hash = createHash('sha256')
    hash.update(paymentDetails)
    return hash.digest('hex')
  }
  public async handlerPayments(transactionId: string) {
    try {
      const payment = await this.VerifyPayment(transactionId)
      let { reference } = payment //reference = "UF-5309"
      const orderId = reference.split('-')[1] //orderId = 5309
      const isThisBrand = reference.split('-')[0] === Env.get('VARIABLE_BRAND')
      const brand = reference.split('-')[0]
      //si no es de UF el pago se redirije al sitio que corresponde
      if (!isThisBrand) {
        return await this.redirectPayment(brand, payment)
      }
      const order = await BigcommerceService.getOrderById(orderId)

      type TransactionStatusHandler = {
        [key in transactionStatus]
      }

      const transactionStatusHandlers: TransactionStatusHandler = {
        [transactionStatus.PENDING]: this.handlePendingPayment,
        [transactionStatus.APPROVED]: this.handleApprovedPayment,
        [transactionStatus.VOIDED]: this.handleDeclinedPayment,
        [transactionStatus.DECLINED]: this.handleDeclinedPayment,
        [transactionStatus.ERROR]: this.handleDeclinedPayment
      }

      if (payment.status) {
        const handlerPayment: TransactionStatusHandler[transactionStatus] = transactionStatusHandlers[payment.status]
        return await handlerPayment(order, payment)
      }
    } catch (error) {
      const errorResponse = {
        status: error.status || 404,
        message: error.message,
        data: error.name || undefined,
        details: error.stack || undefined
      }
      return errorResponse
    }
  }
  private async handlePendingPayment(order, payment) {
    try {
      const { id: order_id } = order
      console.log({ success: true, order: order_id, status: typeStatus[payment.status] })
      return { success: true, order: order_id, status: typeStatus[payment.status] }
    } catch (error) {
      throw error
    }
  }

  private async handleApprovedPayment(order, payment) {
    try {
      const { id: order_id } = order
      // Se busca el status actual de la orden, si está pagado se detiene el proceso
      if (order.status_id == 11) {
        return
      }
      const fullpi = await FullpiService.setOrder(order_id)
      console.log('datos Fullpi : ' + JSON.stringify(fullpi))
      const orderStatusService = new OrdersController()
      const status = 11 // awaiting Fullfilmet
      const updateOrder = await orderStatusService.update_order(order_id, status, order.payment_method, payment.id)
      console.log('estado de la orden actualizado', updateOrder)
      // //Envío de datos a siigo
      // let siigo = await SiigoService.create_docs(order_id, Env.get('SIIGO_ID_WOMPI'))
      // console.log({ 'datos siigo': JSON.stringify(siigo) })

      // if (siigo.status == 200) {
      //   await BigcommerceService.setMetafieldByOrder({ id: order_id }, String(siigo.message.id), 'ct_order_id', 'order_id')
      // }

      // creación de factura en Alegra
      const alegraService = new AlegraService()
      let alegraInvoice = await alegraService.createDocs(Number(order_id))
      console.log({ 'respuesta de creación de factura alegra': JSON.stringify(alegraInvoice) })

      const emailBody = await EmailService.payloadEmail(order_id)
      console.log('cuerpo del email', emailBody)
      const emailProcesOrder = await new ProcesOrder(emailBody).send()
      console.log('email de compra enviado', emailProcesOrder)
      const sacOrder = await new SacOrder(emailBody).send()
      console.log('email enviado SAC', sacOrder)

      //Envío de datos google sheets
      const reportSaleService = new ReportSaleService(order_id)
      const report = await reportSaleService.generateReportAndSendToGoogleSheets()
      console.log('reporte comercial enviado', report)
      //envio a mailchimp para el flujo de reviews
      const mailchimp = await MailchimpService.sponsorReview(order_id)
      console.log('mailchimp flujo review', mailchimp)

      console.log({ success: true, order: order_id, status: typeStatus[payment.status] })
      return { success: true, order: order_id, status: typeStatus[payment.status] }
    } catch (error) {
      throw error
    }
  }

  private async handleDeclinedPayment(order, payment) {
    try {
      const { id: order_id } = order
      // Se busca el status actual de la orden, si está pagado se detiene el proceso
      if (order.status_id == 11) {
        return
      }
      // Actualizar estado de la orden en bigcommerce
      const status =
        payment.status == 'ERROR' ? 5 : payment.status == 'DECLINED' ? 6 : payment.status == 'VOIDED' ? 5 : 6 // status rechazado
      const orderStatusService = new OrdersController()
      await orderStatusService.update_order(order_id, status, order.payment_method, payment.id)
      console.log({ success: true, order: order_id, status: typeStatus[payment.status] })
      return { success: true, order: order_id, status: typeStatus[payment.status] }
    } catch (error) {
      throw error
    }
  }
  private async redirectPayment(brand: string, dataPayment: any) {
    try {
      const payment = {
        data: {
          transaction: dataPayment
        }
      }
      let url: string
      switch (brand) {
        case 'AF':
          url = `${Env.get('URL_AF')}`
          break
        case 'TF':
          url = `${Env.get('URL_TF')}`
          break
        case 'AR':
          url = `${Env.get('URL_AR')}`
          break
        case 'UC':
          url = `${Env.get('URL_UC')}`
          break
        default:
          throw new Error('Invalid brand')
      }

      const response = await axios.post(url, payment)
      console.log(response)

      return response.data
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}
