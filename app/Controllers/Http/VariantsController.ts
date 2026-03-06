import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Variant from 'App/Models/Variant'

export default class VariantsController {
  public async index({}: HttpContextContract) {
    const variants = await Variant.query().preload('product', productQuery => {
      productQuery.select('description')
    })
    return variants
  }
}
