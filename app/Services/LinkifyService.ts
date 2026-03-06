import axios from 'axios'
import Env from '@ioc:Adonis/Core/Env'
import moment from 'moment'
import { PaymentInfo, ValidationResponse } from 'App/Interfaces/LinkifyInterface'
import LinkifyPayment from 'App/Models/LinkifyPayment'

export default class LinkifyService {
  private baseUrl: string

  constructor() {
    this.baseUrl = Env.get('LINKIFY_URL_PAYMENTS')
  }

  private encodeBase64(url: string): string {
    const encodedUrl = Buffer.from(url).toString('base64')
    return encodedUrl
  }

  public async createValidation(paymentInfo: PaymentInfo): Promise<any> {
    try {
      if (paymentInfo.endpoint) {
        paymentInfo.endpoint = this.encodeBase64(paymentInfo.endpoint)
      }

      const response = await axios.post(`${this.baseUrl}`, paymentInfo)

      if (response.data.message) {
        throw new Error(response.data.message)
      }

      await LinkifyPayment.create({
        order_id: paymentInfo.invoice_id,
        uuid_linkify: response.data.uuid,
        status: 'waiting transfer',
        amount: paymentInfo.amount,
        rut: paymentInfo.rut,
        email: paymentInfo.email
      })

      return response.data // Esto me debe devolver {uuuid:identificador, remaining_time:tiempo_restante}
    } catch (error) {
      throw error
    }
  }
  public async getValidation(id: string): Promise<ValidationResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/${id}`)

      if (response.data.message) {
        throw new Error(response.data.message)
      }
      const { uuid, invoice_id, amount, description, rut, date, email, status } = response.data.payment
      const confirmation: ValidationResponse = {
        uuid,
        invoice_id,
        amount,
        description,
        rut,
        date,
        email,
        status
      }
      confirmation.date = moment(confirmation.date).format('DD/MM/YYYY')

      const linkifyPayment = await LinkifyPayment.query().where('uuid_linkify', confirmation.uuid).first()

      if (linkifyPayment) {
        linkifyPayment.merge({
          status: confirmation.status
        })

        await linkifyPayment.save()
      }

      return confirmation
    } catch (error) {
      throw error
    }
  }

  static async redirectPaymentLinkify(channelID: number | string, infoPay: any) {
    if (channelID == Env.get('CHANNEL_ID_AF')) {
      return await axios.post(
        `${Env.get('URL_AF')}/?id=${infoPay.id}&action=${infoPay.action}&completeness=${infoPay.completeness}`
      )
    }

    if (channelID == Env.get('CHANNEL_ID_FC')) {
      return await axios.post(
        `${Env.get('URL_FC')}/?id=${infoPay.id}&action=${infoPay.action}&completeness=${infoPay.completeness}`
      )
    }

    if (channelID == Env.get('CHANNEL_ID_TF')) {
      return await axios.post(
        `${Env.get('URL_TF')}/?id=${infoPay.id}&action=${infoPay.action}&completeness=${infoPay.completeness}`
      )
    }

    if (channelID == Env.get('CHANNEL_ID_TS')) {
      return await axios.post(
        `${Env.get('URL_TS')}/?id=${infoPay.id}&action=${infoPay.action}&completeness=${infoPay.completeness}`
      )
    }

    if (channelID == Env.get('CHANNEL_ID_AR')) {
      return await axios.post(
        `${Env.get('URL_AR')}/?id=${infoPay.id}&action=${infoPay.action}&completeness=${infoPay.completeness}`
      )
    }
    if (channelID == Env.get('CHANNEL_ID_CC')) {
      return await axios.post(
        `${Env.get('URL_CC')}/?id=${infoPay.id}&action=${infoPay.action}&completeness=${infoPay.completeness}`
      )
    }

    if (channelID == Env.get('CHANNEL_ID_SF')) {
      return await axios.post(
        `${Env.get('URL_SF')}/?id=${infoPay.id}&action=${infoPay.action}&completeness=${infoPay.completeness}`
      )
    }

    if (channelID == Env.get('CHANNEL_ID_UC')) {
      return await axios.post(
        `${Env.get('URL_UC')}/?id=${infoPay.id}&action=${infoPay.action}&completeness=${infoPay.completeness}`
      )
    }
  }
}
