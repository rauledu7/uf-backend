import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'

export default class CheckToken {
  private readonly ACCESS_TOKEN: string = Env.get('BIGCOMMERCE_ACCESS_TOKEN')
  public async handle({ response, request }: HttpContextContract, next: () => Promise<void>) {
    const { authorization } = request.headers()
    if (authorization && authorization === this.ACCESS_TOKEN) {
      await next()
    } else {
      response.forbidden({ status: 403, message: 'forbidden access' })
    }
  }
}
