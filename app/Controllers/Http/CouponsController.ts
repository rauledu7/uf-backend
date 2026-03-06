import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import CouponService from 'App/Services/CouponService'

export default class CouponsController {
  public async index({}: HttpContextContract) {}

  public async create({ response, request }: HttpContextContract) {
    const body = request.body()

    if (body.scope == 'roullete') {
      const coupon: any = await CouponService.roulleteCoupon(body)
      if (coupon.status === true) {
        return response.ok(coupon.msg)
      }
      return response.badRequest({ error: coupon.error })
    }
  }

  public async store({}: HttpContextContract) {}

  public async show({ request, response }: HttpContextContract) {
    const { email } = request.body()
    const isValid = await CouponService.validateRoullete(email)
    if (isValid) {
      return response.ok({ msg: 'Email disponible para participar' })
    }
    return response.badRequest({ msg: 'Email ya registrado' })
  }

  public async edit({}: HttpContextContract) {}

  public async update({}: HttpContextContract) {}

  public async destroy({}: HttpContextContract) {}

  public async coupon_email({}: HttpContextContract) {}
}
