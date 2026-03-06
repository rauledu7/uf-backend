import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import cache from 'App/Services/CacheService'

export default class RedisController {
  public async refresh({ request }: HttpContextContract) {
    const redisRefresh = request.all()
    if (redisRefresh?.delete) {
      await cache.flushDB()
      return { status: 200, message: 'Datos de Redis borrados correctamente' }
    }
    return
  }
  catch(error) {
    return error.message
  }
}
