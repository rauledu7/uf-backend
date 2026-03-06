import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CarInterface } from 'App/Interfaces/CartInterface'
import BigcommerceService from 'App/Services/BigcommerceService'
import ShoppingCartService from 'App/Services/ShoppingCartService'
export default class AbandonedCartsController {
  public async index({}: HttpContextContract) {}

  public async create({ request, response }: HttpContextContract) {
    try {
      const data: CarInterface = request.body() as CarInterface
      console.log('cart data: ', data)
      if (!data?.line_items.length || data?.email === undefined || data?.line_items === undefined) {
        return
      }
      const shoppingCartService = new ShoppingCartService(data)
      const cartResponse = await shoppingCartService.createCart()
      if (cartResponse.status === 422) {
        return cartResponse
      }
      const cartId = cartResponse.cart.id
      await BigcommerceService.findOrCreateUser(data.email, cartId)
      const dataCart = await BigcommerceService.getCart(cartId)
      return response.ok(dataCart)
    } catch (error) {
      console.log({ rstatus: 'error', message: 'Cart could not be created', type: error.message, stack: error.stack })
      return { status: 'error', message: 'Cart could not be created', type: error.message, stack: error.stack }
    }
  }

  public async show({ params }: HttpContextContract) {
    const { cartId } = params
    return await ShoppingCartService.getCartAbandoned(cartId)
  }

  public async update({ params, request }: HttpContextContract) {
    const { cartId } = params
    const dataCart = request.body()
    return await ShoppingCartService.updateCartAbandoned(cartId, dataCart)
  }

  public async destroy({ params }: HttpContextContract) {
    const { cartId } = params
    return await ShoppingCartService.deleteCartAbandoned(cartId)
  }

  // public async edit({ params, request, response }: HttpContextContract) {
  //   const { email } = request.body()
  //   const { cartId } = params

  //   const validate_user = await BigcommerceService.findOrCreateUser(email, cartId)

  //   if (validate_user.status === 200) {
  //     return response.ok({ message: 'usuario asignado al carrito' })
  //   }
  //   return response.abort({ error: validate_user })
  // }
}
