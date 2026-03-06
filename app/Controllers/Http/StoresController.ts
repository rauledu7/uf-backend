import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import PrismicService from 'App/Services/PrismicService'

export default class StoresController {
  public async index({}: HttpContextContract) {
    const stores = PrismicService.getStores()

    return stores
  }

  public async create({}: HttpContextContract) {}

  public async store({}: HttpContextContract) {}

  public async show({}: HttpContextContract) {}

  public async edit({}: HttpContextContract) {}

  public async update({}: HttpContextContract) {}

  public async destroy({}: HttpContextContract) {}
}
