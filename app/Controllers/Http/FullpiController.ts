import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import FullpiService from 'App/Services/FullpiService'
import axios from 'axios'
import Env from '@ioc:Adonis/Core/Env'

export default class FullpiController {
  public async sendDataOrder({ params }: HttpContextContract) {
    const { orderId } = params
    return await FullpiService.setOrder(orderId)
  }

  public async getTrackingOrder({ params, response }: HttpContextContract) {
    try {
      const { tracking_id } = params
      const infoOrder = await axios.get(`${Env.get('FULLPI_URL_TRACKING')}&idOrden=${tracking_id}`)

      if (infoOrder?.data?.url_seguimiento === undefined) {
        return response.status(404).json({ status: 200, message: 'order not found' })
      }
      response.status(200).json({ url: infoOrder.data.url_seguimiento })
    } catch (error) {
      response.status(500).json({ error: error.message })
    }
  }
}
