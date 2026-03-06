import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'

export default class ProcesOrder extends BaseMailer {
  constructor(private body) {
    super()
  }

  public prepare(message: MessageContract) {
    const { order, client, shipping, products, store = null } = this.body

    const view =
      order.someReserve && order.allReserve
        ? 'emails/order_every_reserve'
        : order.someReserve && !order.allReserve
        ? 'emails/order_some_reserve'
        : 'emails/processing_order'
    message
      .subject(`¡Muchas gracias por tu compra! 🤗🧡 #${order.nro_pedido}`)
      .from(Env.get('CONTACT_EMAIL'), Env.get('NAME_EMAIL'))
      .to(client.email)
      // .cc('sac@bettercommerce.cl')
      .htmlView(view, {
        order,
        client,
        shipping,
        products,
        store,
        image: Env.get('IMAGE_PROCESS_ORDER'),
        color: Env.get('COLOR_EMAIL'),
        facebook: Env.get('LINK_FACEBOOK '),
        instagram: Env.get('LINK_INSTAGRAM'),
        website: Env.get('LINK_WEBSITE'),
        // despachos: Env.get('LINK_DESPACHO'),
        // zendesk: Env.get('LINK_ZENDESK'),
        // horarios: Env.get('LINK_HORARIOS'),
        country: Env.get('LOCATION'),
        contacto: Env.get('LINK_CONTATCO'),
        // comunas: Env.get('LINK_COMUNAS'),
        // navidad: false,
        currency: Env.get('CURRENCY_SIGN'),
        imageDiscount: Env.get('RETIRO_IMAGE_URL'),
        is_store: this.body.is_retiro
      })
  }
}
