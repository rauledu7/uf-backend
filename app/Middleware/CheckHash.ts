import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import crypto from 'crypto'

export default class CheckHash {
  public async handle({ request, response }: HttpContextContract, next: () => Promise<void>) {
    // code for middleware goes here. ABOVE THE NEXT CALL
    const verification_hash = request.header('x-linkify-confirmation')
    const secret = Env.get('LINKIFY_SECRET_HASH')
    let content
    switch (request.method()) {
      case 'GET':
        content = decodeURIComponent(request.input('encoded_data'))
        break
      case 'POST':
        content = request.all()
        break
    }

    const local_verification_hash = crypto.createHmac('sha256', secret).update(content).digest('hex')
    console.log('LOCAL HASH LINKIFY', local_verification_hash)
    console.log('HASH LINKIFY', verification_hash)
    if (local_verification_hash != verification_hash) {
      return response.forbidden({ message: 'Acceso prohibido' })
    }

    await next()
  }
}
