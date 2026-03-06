import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import MailchimpService from 'App/Services/MailchimpService'
import Env from '@ioc:Adonis/Core/Env'

export default class MailchimpController {
  public async sendDataClient({ params, response }: HttpContextContract) {
    try {
      const { orderId } = params
      const newContact = await MailchimpService.addContact(orderId)
      const audienceContact = await MailchimpService.addContact(orderId, Env.get('MAILCHIMP_AUDIENCIA'))

      //TODO: Devolver la respuesta al cliente
      return response.json({ success: true, audience_better: newContact, audience_brand: audienceContact })
    } catch (error) {
      console.error(error)

      //TODO: Devolver una respuesta de error al cliente
      return response.status(500).json({ success: false, type: error.code, message: error.message, stack: error.stack })
    }
  }

  public async promoteReview({ request }: HttpContextContract) {
    try {
      const data = request.all()
      const response = await MailchimpService.sponsorReview(data.order_id)

      //TODO: Devolver la respuesta al cliente
      return { success: true, data: response }
    } catch (error) {
      console.error(error)

      //TODO: Devolver una respuesta de error al cliente
      return { success: false, type: error.code, message: error.message, stack: error.stack }
    }
  }
}
