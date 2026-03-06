import RoulleteCoupon from 'App/Models/RoulleteCoupon'
import BigcommerceService from './BigcommerceService'
import SendCoupon from 'App/Mailers/SendCoupon'

class CouponService {
  static async roulleteCoupon(payload) {
    const count = await (await RoulleteCoupon.query()).length
    const newCoupon = { name: payload.name, code: `RULETA${count + 1}`, amount: payload.amount }

    try {
      const coupon = await RoulleteCoupon.create(newCoupon)

      if (coupon.amount.length <= 2) {
        const data = {
          name: `Ruleta ${coupon.name}`,
          type: 'percentage_discount',
          amount: coupon.amount,
          code: coupon.code,
          min_purchase: parseInt(payload.amount) === 10 ? '50000' : '70000',
          expires: 'Tue, 31 Dec 2024 02:00:00 +0000',
          enabled: true,
          //"num_uses": 2,
          max_uses: 1,
          applies_to: {
            entity: 'categories',
            ids: [409]
          },
          restricted_to: {
            zips: {
              CL: ['MÁXIMO DESCUENTO']
            }
          }
          //"max_uses_per_customer": 0,
          //"restricted_to": {},
          //"shipping_methods": [],
        }
        const createCoupon = await BigcommerceService.createCoupon(data)
        if (createCoupon.status === 200) {
          const bodyEmail = { name: coupon.name, code: data.code, amount: data.amount }
          await new SendCoupon(bodyEmail).send()
          return { status: true, msg: coupon }
        }

        return { status: false, error: createCoupon.message }
      }
      return { status: true, msg: coupon }
    } catch (error) {
      return { status: false, error }
    }
  }

  static async validateRoullete(email) {
    const coupon = await RoulleteCoupon.query().where({ name: email })
    if (coupon.length === 0) {
      return true
    }

    return false
  }
}

export default CouponService
