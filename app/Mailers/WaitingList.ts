import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'

export default class WaitingList extends BaseMailer {
  constructor(private body) {
    super()
  }
  public prepare(message: MessageContract) {
    const { email, url_product, title, sku, image } = this.body
    message
      .subject('La espera se acabó')
      .from(Env.get('CONTACT_EMAIL'), Env.get('NAME_EMAIL'))
      .to(email)
      .htmlView('emails/waiting_list', {
        email,
        url_product,
        title,
        sku,
        image,
        header_image: Env.get('IMAGE_HEADER_EMAILS'),
        color: Env.get('COLOR_EMAIL'),
        logo: Env.get('LOGO_EMAIL'),
        website: Env.get('LINK_WEBSITE'),
        marca: Env.get('NAME_EMAIL'),
        zendesk: Env.get('LINK_ZENDESK')
      })
  }
}
