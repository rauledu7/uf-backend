import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { COUNTRY } from 'App/Interfaces/Countries'
import Env from '@ioc:Adonis/Core/Env'
export default class CheckColombia {
  public async handle({ response }: HttpContextContract, next: () => Promise<void>) {
    // code for middleware goes here. ABOVE THE NEXT CALL
    if (Env.get('LOCATION') !== COUNTRY.PE) {
      return response.forbidden({ msg: 'forbidden access' })
    }
    await next()
  }
}
