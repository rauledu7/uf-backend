import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BigcommerceService from 'App/Services/BigcommerceService'

export default class BrandsController {
  public async show({ params }: HttpContextContract) {
    const brands = await BigcommerceService.getProductsByBrand(params)

    return brands
  }
}
