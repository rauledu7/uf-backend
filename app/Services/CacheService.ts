import redis from '@ioc:Adonis/Addons/Redis'
import Env from '@ioc:Adonis/Core/Env'

class CacheService {
  private enabled = Env.get('USE_REDIS_CACHE', 'true') === 'true'

  /** Verifica si una clave existe */
  async has(...keys: string[]) {
    if (!this.enabled) return false
    return await redis.exists(...keys)
  }

  /** Obtiene una clave del cache */
  async get(key: string) {
    if (!this.enabled) return null

    try {
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (err) {
      console.error(`[CacheService][GET] Error obteniendo la clave ${key}:`, err)
      return null
    }
  }

  /** Set simple con TTL por defecto de 10 minutos */
  async set(key: string, value: any, time = 600) {
    if (!this.enabled) return
    return await redis.set(key, JSON.stringify(value), 'EX', time)
  }

  /** Set solo si no existe */
  async setIfNotExists(key: string, value: any, ttl = 600) {
    if (!this.enabled) return
    return await redis.set(key, JSON.stringify(value), 'EX', ttl, 'NX')
  }

  /** Actualiza si existe , mantiene TTL */
  async updateIfExists(key: string, value: any) {
    if (!this.enabled) return

    const exists = await redis.exists(key)
    if (exists) {
      const ttl = await redis.ttl(key)
      return await redis.set(key, JSON.stringify(value), 'EX', ttl)
    }
    return null
  }

  /** TTL restante de una clave */
  async ttl(key: string) {
    if (!this.enabled) return -2
    return await redis.ttl(key)
  }

  /** Indica si el TTL está por debajo de cierto umbral */
  async shouldRefresh(key: string, thresholdSeconds = 120): Promise<boolean> {
    if (!this.enabled) return false
    const ttl = await redis.ttl(key)
    return ttl > 0 && ttl <= thresholdSeconds
  }

  /** Elimina claves */
  async delete(...keys: string[]) {
    if (!this.enabled) return
    return await redis.del(...keys)
  }

  /** Elimina toda la base de datos (¡solo con cuidado!) */
  async flushDB() {
    if (!this.enabled) return
    return await redis.flushdb()
  }

  /** Validación de datos antes de cachear */
  isValidData(value: any): boolean {
    return value && typeof value === 'object' && Array.isArray(value?.products)
  }

  /** Set seguro con validación previa */
  async safeSet(key: string, value: any, ttl = 600) {
    if (!this.enabled || !this.isValidData(value)) return false
    return await this.set(key, value, ttl)
  }

  /** Refresca una clave en segundo plano con bloqueo */
  async refreshInBackground(key: string, fetchFn: () => Promise<any>, ttl = 600, lockTtl = 120) {
    if (!this.enabled) return

    const lockKey = `lock:${key}`
    const lock = await redis.set(lockKey, '1', 'EX', lockTtl, 'NX')
    if (!lock) return // Otro proceso ya la está refrescando

    try {
      const data = await fetchFn()
      if (this.isValidData(data)) {
        await this.set(key, data, ttl)
      }
    } catch (error) {
      console.error(`[CacheService][refreshInBackground] Error actualizando ${key}:`, error)
    }
  }
}

const cache = new CacheService()
export default cache
