import Env from '@ioc:Adonis/Core/Env'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import axios from 'axios'

// 🛒 Controlador principal para la gestión de carritos de compras
export default class CartController {
  // 🌐 URL del microservicio de carritos, obtenida desde variables de entorno
  private readonly cartServiceUrl: string

  constructor() {
    // ⚠️ Validación de variable de entorno obligatoria
    const url = Env.get('MICROSERVICE_CART_URL')
    if (!url) {
      // 🚨 Lanzar error si la variable no está definida
      throw new Error(
        'La variable de entorno MICROSERVICE_CART_URL no está definida. Por favor, configúrala en tu archivo .env'
      )
    }
    this.cartServiceUrl = url
  }

  // 🆕 Crear un nuevo carrito
  public async create({ request, response }: HttpContextContract) {
    const cartData = request.body()
    try {
      // 📤 Enviar datos al microservicio para crear el carrito
      const result = await axios.post(this.cartServiceUrl, cartData, {
        headers: { 'Content-Type': 'application/json' }
      })
      return response.ok(result.data)
    } catch (err) {
      // ❌ Manejo de errores al crear carrito
      console.error('❌ Error al crear carrito vía RPC:', err)
      return response.internalServerError({ error: 'No se pudo procesar el carrito' })
    }
  }

  // 🔄 Actualizar un carrito existente
  public async update({ request, response }: HttpContextContract) {
    const cartData = request.params()
    const carBody = request.body()
    try {
      // 📝 Actualizar carrito en el microservicio
      const result = await axios.put(`${this.cartServiceUrl}/${cartData.cartId}`, carBody, {
        headers: { 'Content-Type': 'application/json' }
      })
      return response.ok(result.data)
    } catch (err) {
      // ❌ Manejo de errores al actualizar carrito
      console.error('❌ Error al actualizar carrito:', err)
      return response.abort({ error: 'Error al actualizar Carrito de Compras', cause: err.response.data })
    }
  }

  // 🔍 Obtener información de un carrito específico
  public async get({ request, response }: HttpContextContract) {
    const cartData = request.params()
    try {
      // 📥 Solicitar datos del carrito al microservicio
      const result = await axios.get(`${this.cartServiceUrl}/${cartData.cartId}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      return response.ok(result.data)
    } catch (err) {
      // ❌ Manejo de errores al obtener carrito
      console.error('❌ Error al crear carrito vía RPC:', err)
      return response.internalServerError({ error: 'No se pudo procesar el carrito' })
    }
  }

  // 🗑️ Eliminar un carrito
  public async delete({ request, response }: HttpContextContract) {
    const cartData = request.params()
    try {
      // 🧹 Solicitar eliminación del carrito al microservicio
      const result = await axios.delete(`${this.cartServiceUrl}/${cartData.cartId}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      return response.ok(result.data)
    } catch (err) {
      // ❌ Manejo de errores al eliminar carrito
      console.error('❌ Error al crear carrito vía RPC:', err)
      return response.internalServerError({ error: 'CartId not found' })
    }
  }

  // 🔄 Convertir un carrito en orden
  public async convert({ request, response }: HttpContextContract) {
    const cartData = request.params()
    try {
      // 🔁 Solicitar conversión del carrito a orden
      const result = await axios.put(`${this.cartServiceUrl}/${cartData.cartId}/convert`, {
        headers: { 'Content-Type': 'application/json' }
      })
      return response.ok(result.data)
    } catch (err) {
      // ❌ Manejo de errores al convertir carrito
      console.error('❌ Error al crear carrito vía RPC:', err)
      return response.internalServerError({ error: 'No se pudo procesar el carrito' })
    }
  }

  // 🔎 Buscar carritos por parámetros de consulta
  public async cartsByQuery({ request, response }: HttpContextContract) {
    const cartQuery = request.all()
    // 🧩 Construir query string dinámicamente
    const queryString = new URLSearchParams(cartQuery).toString()
    try {
      // 📊 Obtener carritos según filtros
      const result = await axios.get(`${this.cartServiceUrl}?${queryString}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      return response.ok(result.data)
    } catch (err) {
      // ❌ Manejo de errores en la consulta de carritos
      console.error(`❌ Error al obtener carrito  con query: ${JSON.stringify(cartQuery)}`, err)
      return response.internalServerError({ error: 'No se pudo procesar el carrito' })
    }
  }
}
