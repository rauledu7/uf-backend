import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'
import fs from 'fs'

export default class ProdutStockAlert extends BaseMailer {
  private excelFilePath: string

  constructor(excelFilePath: string) {
    super()
    this.excelFilePath = excelFilePath
  }

  public prepare(message: MessageContract) {
    message
      .subject('Productos con stock de seguridad')
      .from(Env.get('CONTACT_EMAIL'), Env.get('NAME_EMAIL'))
      .to(Env.get('CONTACT_EMAIL_STOCK_PRODUCT'))
      .cc(Env.get('CONTACT_EMAIL_STOCK_CC'))
      .attachData(fs.createReadStream(this.excelFilePath), { filename: 'Stock-de-seguridad.xlsx' })
    // .htmlView('emails/product_alert_stock', {
    //   country: Env.get('LOCATION'),
    //   logo: Env.get('LOGO_EMAIL'),
    //   color: Env.get('COLOR_EMAIL'),
    //   marca: Env.get('NAME_EMAIL'),
    // })
  }
}
