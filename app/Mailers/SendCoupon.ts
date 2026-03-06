import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'

export default class SendCoupon extends BaseMailer {
  constructor(private body) {
    super()
  }

  public prepare(message: MessageContract) {
    const { name, code, amount } = this.body
    message
      .subject('Cupón Ultimate Fitness')
      .from(Env.get('CONTACT_EMAIL'), Env.get('NAME_EMAIL'))
      .to(name)
      .htmlView('emails/send_coupon', {
        code,
        amount: parseInt(amount),
        image: Env.get('IMAGE_HEADER_EMAILS'),
        color: Env.get('COLOR_EMAIL'),
        website: Env.get('LINK_WEBSITE'),
        marca: Env.get('NAME_EMAIL'),
        zendesk: Env.get('LINK_ZENDESK')
      })
  }
}
