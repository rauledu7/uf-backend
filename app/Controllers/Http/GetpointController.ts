import GetpointService from 'App/Services/GetpointService'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class GetpointController {
  public async sendOrderToGetpoint({ request, response }: HttpContextContract) {
    const { data } = request.body()
    let order: any = []

    let total = 0
    try {
      if (!data) {
        return response.status(422).json({
          status: 422,
          message: 'Por favor envíe un Array con los ID de las ordenes dentro del Body'
        })
      }

      for (const OrderID of data) {
        const wms = await GetpointService.setOrder(OrderID)
        order.push(wms)
        total += 1
      }

      response.status(200).json({ status: 200, message: `${total} ordenes enviadas a getpoint`, data: order })
    } catch (error) {
      response.status(400).json({ status: 'error', message: error.message })
    }
  }
}
