import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import MailchimpService from 'App/Services/MailchimpService'
import WompiService from 'App/Services/WompiService'
import Env from '@ioc:Adonis/Core/Env'

export default class WompiController {
  private wompiService: WompiService

  constructor() {
    this.wompiService = new WompiService()
  }

  public async createTransaction({ request, response }: HttpContextContract) {
    const { orderId } = request.params()
    try {
      const responseData = await this.wompiService.preparePayment(orderId)
      //TODO: Envío de datos del cliente a Mailchimp
      await MailchimpService.addContact(Number(orderId))
      await MailchimpService.addContact(Number(orderId), Env.get('MAILCHIMP_AUDIENCIA'))
      return response.json(responseData)
    } catch (error) {
      return response.status(200).json({ error: error.message })
    }
  }

  public async payments({ request, response }: HttpContextContract) {
    const { transaction_id } = request.all()
    try {
      console.log(transaction_id)
      const paymentVerification = await this.wompiService.VerifyPayment(transaction_id)
      return response.status(200).json(paymentVerification)
    } catch (error) {
      return response.status(error.status || 500).json({ error: error })
    }
  }

  public async notifications({ request, response }: HttpContextContract) {
    const { data } = request.all() // id de la transacción en wompi
    try {
      const paymentVerification = await this.wompiService.handlerPayments(data.transaction.id)
      return response.status(200).json(paymentVerification)
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }
}
