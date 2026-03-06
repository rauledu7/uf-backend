import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import CategoryService from 'App/Services/CategoryService'
import cache from 'App/Services/CacheService'
import Env from '@ioc:Adonis/Core/Env'

export default class MenusController {
  protected readonly cacheMenu = `${Env.get('VARIABLE_BRAND')}-${Env.get('COUNTRY_CODE')}-menu`
  protected readonly nodeEnv = Env.get('NODE_ENV') !== 'development'
  public async index({}: HttpContextContract) {
    if (this.nodeEnv && (await cache.has(this.cacheMenu))) {
      return await cache.get(this.cacheMenu)
    }
    const menu = await CategoryService.getMenu()
    if (this.nodeEnv) {
      await cache.set(this.cacheMenu, menu)
    }
    return menu
  }
}
