import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import BsaleService from 'App/Services/BsaleService'
import OrdersController from './OrdersController'
import GetpointService from 'App/Services/GetpointService'
import BigcommerceService from 'App/Services/BigcommerceService'
import Commune from 'App/Models/Commune'
import Product from 'App/Models/Product'
import ProcesOrder from 'App/Mailers/ProcesOrder'
import SacOrder from 'App/Mailers/SacOrder'
import ButtonPayment from 'App/Mailers/ButtonPayment'
import TransbankService from 'App/Services/TransbankService'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
import EmailService from 'App/Services/EmailService'
import MailchimpService from 'App/Services/MailchimpService'
//import ProdutStockAlert from 'App/Mailers/ProductStockAlert'
import { COUNTRY } from 'App/Interfaces/Countries'
import WebhookService from 'App/Services/WebhookServices'
import CitiesPeru from 'App/Models/CitiesPeru'

export default class IntegrationsController {
  public async update_status_order({ request, response }: HttpContextContract) {
    if (Env.get('LOCATION') === COUNTRY.CL) {
      this.generate_bsale_docs(request, response)
    }
    if (Env.get('LOCATION') === COUNTRY.COL) {
      return await WebhookService.order_status_colombia(request, response)
    }
    if (Env.get('LOCATION') === COUNTRY.PE) {
      return await WebhookService.order_status_peru(request, response)
    }
  }
  public async generate_bsale_docs(request, response) {
    const data = request.body()

    let order_id = parseInt(data.data.id)
    const OrdersControllerInstance = new OrdersController()
    const order = await BigcommerceService.getOrderById(order_id)
    const channel_id = order.channel_id
    if (
      channel_id == Env.get('BIGCOMMERCE_CHANNEL_ID') &&
      order.billing_address.country_iso2 == Env.get('COUNTRY_CODE')
    ) {
      let old_status = data.data.status.previous_status_id
      let status = data.data.status.new_status_id
      const type_document =
        order.staff_notes?.toLowerCase() == 'boleta' || order.staff_notes?.toUpperCase() == 'factura'
          ? { value: order.staff_notes?.toLowerCase() }
          : await BigcommerceService.getIdMetafieldByOrder(order_id, 'document_type')
      if (status == 12) {
        const isGiftCard = order.payment_method.toLowerCase().includes('gift')

        let bsale = await BsaleService.setBsaleDocs(order_id, isGiftCard) //cambiar staff notes, obtener metafield document_type id 68
        console.log('bsale', bsale)
        if (bsale.status == 200) {
          const getpoint = GetpointService.setOrder(order_id)
          console.log('WMS', getpoint)

          BigcommerceService.setMetafieldByOrder({ id: order_id }, String(bsale.message.id), 'ct_order_id', 'order_id')
          OrdersControllerInstance.update({
            params: {
              status: Env.get('VERIFY_CODE_STATUS_PAYMENT'),
              order_id: order_id,
              token: bsale.message.token,
              authorizationCode: 0
            }
          })
          const body_email = await EmailService.payloadEmail(order_id, bsale.message.token)
          await new ProcesOrder(body_email).send()
          return await new SacOrder(body_email).send()
        }
        return
      }
      if (old_status == 11 && status == 5) {
        const document_id_bsale = await BigcommerceService.getIdMetafieldByOrder(order_id, 'order_id')
        let bsale = await BsaleService.setBsaleReturnDocs(
          order_id,
          parseInt(document_id_bsale.value),
          type_document.value
        ) //cambiar staff notes, obtener metafield document_type id 68
        return bsale
      }
      if (old_status == 7 && status == 14) {
        const { id, staff_notes, total_inc_tax, customer_id } = order
        const session = staff_notes?.toLowerCase() === 'factura' ? `F${id}CL${customer_id}` : `B${id}CL${customer_id}`
        const webpay = await TransbankService.setPayment(
          String(id),
          session,
          String(parseInt(total_inc_tax)),
          `${Env.get('URL_SITE')}/cl/purchase_validation`
        )
        const product_link = await BigcommerceService.getPriceProductByLink(order.products.url)
        const body_email = await EmailService.payloadEmail(order_id)
        const { products, ...restBody } = body_email
        const productsMerge = products.map(product => {
          const { price, ...restProduct } = product
          return { ...restProduct, price: product_link[product.sku] }
        })
        return await new ButtonPayment({
          ...restBody,
          products: productsMerge,
          url: `${Env.get('URL_SITE')}/button-payment?url=${webpay.url}&token=${webpay.token}`
        }).send()
      }
      if (status === 13) {
        return await EmailService.generate_email(order_id)
      }
    }
    response.notFound({ message: 'Order not found' })
  }

  public async newsletter({ request }: HttpContextContract) {
    const { email } = request.body()
    try {
      const contact = await MailchimpService.addContactNewsletter(email)

      return contact
    } catch (error) {
      return error
    }
  }

  public async get_price_armed({ response, params }: HttpContextContract) {
    if (Env.get('LOCATION') === COUNTRY.CL) {
      try {
        const commune = await Commune.findBy('id', params.commune_id)
        let translate: any = commune?.traslate

        if (translate == -1) return { status: 404, message: 'Armado no disponible para la comuna seleccionada' }

        const region = commune?.region_id

        const product = await Product.findBy('sku', params.sku)

        if (product == null) return { status: 404, message: 'Producto no disponible para servicio de armado' }

        let price_armed: any = region == 13 ? product?.price_stgo : product?.price_region

        let price = Number(translate) + Number(price_armed)

        return price
      } catch (error) {
        console.error('Error al eliminar el producto:', error)
      }
    }

    if (Env.get('LOCATION') === COUNTRY.COL) {
      try {
        const commune = await Commune.findBy('id', params.commune_id)
        const product = await Product.findBy('sku', params.sku)

        if (!commune) return response.status(404).json('No hay servicio de armado para la zona ingresada')
        if (!product) return response.status(404).json('El producto no cuenta con servicio de armado')

        const recargo = commune?.zona // es el valor del recargo por ser una ciudad fuera del perimetro

        let price_armed: number = product?.price_value + recargo

        return response.status(200).json(price_armed)
      } catch (error) {
        response.status(500).json(`Hubo un error al intentar obtener los datos:${error.message}`)
      }
    }
    if (Env.get('LOCATION') === COUNTRY.PE) {
      const commune = await CitiesPeru.findBy('id', params.commune_id)
      let translate: any = commune?.traslate

      if (translate == -1) return { status: 404, message: 'Armado no disponible para la comuna seleccionada' }

      const product = await Product.findBy('sku', params.sku)

      if (product == null) return { status: 404, message: 'Producto no disponible para servicio de armado' }

      let price_armed: any = product?.price_value

      let price = Number(translate) + Number(price_armed)

      return price
    }
  }

  public async get_status_armed({ params }: HttpContextContract) {
    const product = await Product.findBy('sku', params.sku)

    if (product == null) return { status: 404, message: 'Producto no disponible para servicio de armado' }

    return true
  }

  public async deleteProductsFromBigCommerce({ request }: HttpContextContract) {
    console.log('DELETE-WEBHOOK', request)
    const data = request.body()
    let product_id = data.data.id
    //eliminar producto en la base de datos
    try {
      const result = await ProductsBigcommerce.query().where('product_id', product_id).delete()

      // Verificar si se eliminó el registro
      if (result) {
        console.log(`El producto con product_id ${product_id} ha sido eliminado.`)
      } else {
        console.log(`No se encontró ningún producto con product_id ${product_id}.`)
      }
    } catch (error) {
      console.error('Error al eliminar el producto:', error)
    }
  }
  // public async notificationProductStock({ request }: HttpContextContract) {
  //   const data = request.body()
  //   let product_id = data.data.id
  //   let product_stock = data.data.inventory.value
  //   const productInformation = await BigcommerceService.getProductSingle(product_id)

  //   const formatData = {
  //     product_id,
  //     product_stock,
  //     name: productInformation.name,
  //     sku: productInformation.sku,
  //     inventory_level: productInformation.inventory_level,
  //     inventory_warning_level: productInformation.inventory_warning_level,
  //   }

  //   try {
  //     const existingNotification = await NotificationInventoryMail.findBy('product_id', product_id)

  //     if (!existingNotification) {
  //       if (
  //         (productInformation.brand_id == 38 || productInformation.brand_id == 42) &&
  //         productInformation.inventory_warning_level <= productInformation.inventory_level &&
  //         productInformation.inventory_level <= 10
  //       ) {
  //         await NotificationInventoryMail.create({
  //           product_id: product_id,
  //           mail_send: true,
  //           inventory: productInformation.inventory_level,
  //         })
  //         await new ProdutStockAlert(formatData).send()
  //       }
  //     } else {
  //       if (productInformation.inventory_level > 5) {
  //         await existingNotification.delete()
  //       }
  //     }
  //   } catch (error) {
  //     console.log(error)
  //   }
  // }
}
