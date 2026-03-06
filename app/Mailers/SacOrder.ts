import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'
export default class SacOrder extends BaseMailer {
  constructor(private body) {
    super()
  }

  public prepare(message: MessageContract) {
    const { order, client, shipping, products } = this.body
    message
      .subject(`Nuevo pedido en Ultimate Chile #${order.nro_pedido}`)
      .from(Env.get('CONTACT_EMAIL'), Env.get('NAME_EMAIL'))
      .to('sac@bettercommerce.cl')
      .htmlView('emails/sac_order', {
        order,
        client,
        shipping,
        products,
        country: Env.get('LOCATION'),
        logo: Env.get('LOGO_EMAIL'),
        color: Env.get('COLOR_EMAIL'),
        marca: Env.get('NAME_EMAIL')
      })
  }
}
