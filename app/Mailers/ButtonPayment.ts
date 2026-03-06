import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'
export default class ButtonPayment extends BaseMailer {
  constructor(private body) {
    super()
  }
  /**
   * The prepare method is invoked automatically when you run
   * "ButtonPayment.send".
   *
   * Use this method to prepare the email message. The method can
   * also be async.
   */
  public prepare(message: MessageContract) {
    const { order, client, shipping, products, url } = this.body
    message
      .subject('Boton de pago')
      .from(Env.get('CONTACT_EMAIL'), Env.get('NAME_EMAIL'))
      .to(client.email)
      .htmlView('emails/button_payment', {
        order,
        client,
        shipping,
        products,
        url,
        facebook: Env.get('LINK_FACEBOOK '),
        instagram: Env.get('LINK_INSTAGRAM'),
        website: Env.get('LINK_WEBSITE'),
        marca: Env.get('NAME_EMAIL'),
        logo: Env.get('LOGO_EMAIL'),
        image: Env.get('IMAGE_HEADER_EMAILS'),
        color: Env.get('COLOR_EMAIL')
      })
  }
}
