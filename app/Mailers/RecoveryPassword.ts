import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'

export default class RecoveryPassword extends BaseMailer {
  constructor(private body) {
    super()
  }

  public prepare(message: MessageContract) {
    const { link, contact } = this.body
    message
      .subject('Recuperación de contraseña: Accede a tu cuenta')
      .from(Env.get('CONTACT_EMAIL'), Env.get('NAME_EMAIL'))
      .to(contact)
      .htmlView('emails/recovery_password', {
        link,
        image: Env.get('IMAGE_HEADER_EMAILS'),
        color: Env.get('COLOR_EMAIL'),
        logo: Env.get('LOGO_EMAIL'),
        facebook: Env.get('LINK_FACEBOOK '),
        instagram: Env.get('LINK_INSTAGRAM'),
        website: Env.get('LINK_WEBSITE'),
        marca: Env.get('NAME_EMAIL')
      })
  }
}
