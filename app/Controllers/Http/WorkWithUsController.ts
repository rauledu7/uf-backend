import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import PrismicService from 'App/Services/PrismicService'

export default class WorkWithUsController {
  public async index({}: HttpContextContract) {
    const vacancies = await PrismicService.getWorkWithUsContent()

    return vacancies
  }
}
