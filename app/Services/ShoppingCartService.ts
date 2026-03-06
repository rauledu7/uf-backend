import BigcommerceService from './BigcommerceService'
import { CarInterface } from 'App/Interfaces/CartInterface'
import Env from '@ioc:Adonis/Core/Env'
import GeneralService from './GeneralService'
import Guest from 'App/Models/Guest'

export default class ShoppingCartService {
  constructor(private cartData: CarInterface) {}

  public async createCart() {
    try {
      let cart = this.cartData
      cart = Object.assign(this.cartData, {
        channel_id: Env.get('BIGCOMMERCE_CHANNEL_ID'),
        currency: {
          code: Env.get('CURRENCY_ID')
        },
        locale: Env.get('LOCALE_STRING')
      })
      return await BigcommerceService.createCart(cart)
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  static async getCartAbandoned(cartId: string) {
    try {
      const abandoned_cart = await BigcommerceService.getCart(cartId)

      if (!abandoned_cart || !abandoned_cart?.cart || abandoned_cart?.cart?.line_items === undefined) {
        return
      }

      const { physical_items } = abandoned_cart?.cart?.line_items

      const productsIds = physical_items.map(product => ({
        id: product.product_id === 0 ? 'custom' : product.product_id,
        quantity: product.quantity
      }))
      let res: any = []
      if (productsIds.length > 0) {
        res = await Promise.all(
          productsIds.map(async prod => {
            if (prod.id > 0) {
              let product: any = await BigcommerceService.getProductSingle(prod.id)
              product.quantity = prod.quantity
              return product
            }
          })
        )
      }
      const data = res.filter(product => product != undefined || product.id === 'custom')
      const data_products = {
        data
      }
      const format_products = await GeneralService.formatProducts(data_products)
      const variants_list = {}
      physical_items.map(product => {
        const isVariants = this.filterByVariantId(format_products, product.variant_id)
        if (isVariants) {
          variants_list[product.variant_id] = isVariants.variants
        }
      })
      const products = physical_items.map(product => {
        const prod = this.filterProductFormated(format_products, product.variant_id)
        return {
          id: product.variant_id,
          title: prod.title,
          sku: prod.sku,
          normal_price: prod.normal_price,
          discount_price: prod.discount_price,
          discount_rate: prod.discount_rate,
          stock: prod.stock,
          warning_stock: prod.warning_stock,
          image: variants_list[product.variant_id].image,
          images: variants_list[product.variant_id].images,
          options: variants_list[product.variant_id] ? variants_list[product.variant_id].options : [],
          quantity: product.quantity,
          armed_cost: 0,
          armed_quantity: 0,
          weigth: prod.weight,
          type: prod.type,
          id_link: product.product_id,
          free_shipping: prod.free_shipping,
          sameday: prod.sameday
        }
      })

      return { products_list: products, cart_id: abandoned_cart.cart.id }
    } catch (error) {
      throw error
    }
  }

  static async updateCartAbandoned(cartId: string, dataCart: any) {
    try {
      const { items } = dataCart
      const getCart = await BigcommerceService.getCart(cartId)
      const { status, cart } = getCart

      if (status === 200) {
        const { physical_items, custom_items } = cart.line_items
        const addResults = items.map(item => {
          const newItemProductId = item.product_id
          const productExistsInDatabase = physical_items.some(item => item.product_id === newItemProductId)
          return {
            product_id: newItemProductId,
            isProductCart: productExistsInDatabase
          }
        })
        const removedResults = physical_items.map(item => {
          const newItemProductId = item.product_id
          const productExistsInDatabase = items.some(item => item.product_id === newItemProductId)
          const removedFromItemsArray = !productExistsInDatabase
          return {
            id: item.id,
            product_id: newItemProductId,
            isRemoved: removedFromItemsArray
          }
        })
        await Promise.all(
          addResults.map(async elem => {
            if (!elem.isProductCart) {
              const line_items = items.filter(item => item.product_id === elem.product_id)
              await BigcommerceService.addItemCart(cartId, { items: line_items })
            }
          })
        )
        await Promise.all(
          removedResults.map(async elem => {
            if (elem.isRemoved) {
              await BigcommerceService.deleteItemCart(cartId, elem.id)
            }
          })
        )

        return { message: 'Carrito actualizado' }
      }
    } catch (error) {
      throw error
    }
  }

  static async deleteCartAbandoned(cartId: string) {
    const cartInTableGuestDB = await Guest.findBy('cart_id', cartId)
    if (cartInTableGuestDB) {
      cartInTableGuestDB.recover = true
      cartInTableGuestDB.save()
    }
    return await BigcommerceService.deleteCart(cartId)
      .then(res => {
        if (res.status === 200) {
          return { message: 'Carrito borrado correctamente' }
        }
        return {
          message: 'No se pudo borrar el carrito',
          error: res.message.errors
        }
      })
      .catch(error => {
        return { message: 'Ha ocurrido un error inesperado', error }
      })
  }
  static filterProductFormated(products_formated, variantId) {
    const objetoEncontrado = products_formated.find(obj => {
      return obj.variants.some(variant => variant.id === variantId)
    })

    return objetoEncontrado
  }
  static filterByVariantId(products_formated, variantId) {
    const foundVariant = products_formated.flatMap(obj => obj.variants).find(variant => variant.id === variantId)

    return foundVariant ? { variants: foundVariant } : null
  }
}
