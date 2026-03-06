import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'
import BigcommerceService from 'App/Services/BigcommerceService'

export default class CompleteOrder extends BaseMailer {
  private productsWeight = 0

  constructor(private body) {
    super()
  }

  public async prepare(message: MessageContract) {
    message
      .subject(`Conoce el estado de tus productos del pedido #${this.body.id}`)
      .from(Env.get('CONTACT_EMAIL'), Env.get('NAME_EMAIL'))
      .to(this.body.email) //enviar a email del cliente
      .htmlView('emails/complete_order', {
        ...this.body,
        logo: Env.get('LOGO_EMAIL'),
        image: Env.get('IMAGE_HEADER_EMAILS'),
        color: Env.get('COLOR_EMAIL'),
        bg_color: Env.get('BG_COLOR_EMAIL'),
        facebook: Env.get('LINK_FACEBOOK'),
        instagram: Env.get('LINK_INSTAGRAM'),
        contacto: Env.get('LINK_CONTATCO'),
        website: Env.get('LINK_WEBSITE'),
        marca: Env.get('MARCA'),
        weightProduct: await this.getWeightProducts(),
        imageDiscount: Env.get('RETIRO_IMAGE_URL')
      })
  }
  private async getWeightProducts() {
    const order = await BigcommerceService.getProductsByOrder(this.body.id)

    const productsWeight = order.reduce((totalWeight, product) => totalWeight + parseFloat(product.weight), 0)
    this.productsWeight = parseFloat(productsWeight.toFixed(2))
    return this.productsWeight
  }
}
