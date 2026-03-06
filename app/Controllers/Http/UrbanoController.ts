import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import UrbanoService from 'App/Services/UrbanoServices'

export default class UrbanoController {
  public async createUrbano({ params }: HttpContextContract) {
    const { orderId } = params
    const urbano = await UrbanoService.setOrder(orderId)
    return urbano
  }
}
