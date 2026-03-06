import OrdersController from 'App/Controllers/Http/OrdersController'
import Env from '@ioc:Adonis/Core/Env'
//import SiigoService from './SiigoService'
import EmailService from './EmailService'
import ProcesOrder from 'App/Mailers/ProcesOrder'
import SacOrder from 'App/Mailers/SacOrder'
import BigcommerceService from './BigcommerceService'
import GeneralService from './GeneralService'
import CompleteOrder from 'App/Mailers/CompleteOrder'
import FullpiService from './FullpiService'
import BsaleService from './BsaleService'
import UrbanoService from './UrbanoServices'
import AlegraService from './Alegra/AlegraService'

class WebhookService {
  static readonly alegraService = new AlegraService()
  static async order_status_colombia(request, response) {
    const data = request.body()
    let order_id = parseInt(data.data.id)
    const OrdersControllerInstance = new OrdersController()
    const order = await OrdersControllerInstance.show({ params: { order_id: order_id } })
    const channel_id = order.channel_id
    if (
      channel_id == Env.get('BIGCOMMERCE_CHANNEL_ID') &&
      order.billing_address.country_iso2 == Env.get('COUNTRY_CODE')
    ) {
      let old_status = data.data.status.previous_status_id
      let status = data.data.status.new_status_id
      const type_document =
        order.order?.staff_notes.toLowerCase() == 'debito' || order.order?.staff_notes.toLowerCase() == 'credito'
          ? { value: order?.staff_notes.toLowerCase() }
          : await BigcommerceService.getIdMetafieldByOrder(order_id, 'document_type')
      if (status == 12) {
        // const payment_method = type_document.value == 'debito' ? 'SIIGO_ID_DEBITO' : 'SIIGO_ID_CREDITO'
        // let siigo = await SiigoService.create_docs(order_id, Env.get(payment_method)) //cambiar staff notes, obtener metafield document_type id 68

        // creación de factura en Alegra
        let alegraInvoice = await this.alegraService.createDocs(Number(order_id))
        console.log({ 'respuesta de creación de factura alegra': JSON.stringify(alegraInvoice) })
        const fullpi = await FullpiService.setOrder(order_id)
        console.log('fullpi', fullpi)
        // if (siigo.status == 200) {
        const status = 11 //Awaiting Fullfillment
        OrdersControllerInstance.update_order(order_id, status, type_document.value)
        // BigcommerceService.setMetafieldByOrder({ id: order_id }, String(siigo.message.id), 'ct_order_id', 'order_id')
        const body_email = await EmailService.payloadEmail_CO(order_id)
        await new ProcesOrder(body_email).send()
        return await new SacOrder(body_email).send()
        // }
        return { error: 'hubo un error' }
      }
      if (old_status == 11 && status == 5) {
        const createCreditNote = await this.alegraService.createCreditNotes(order_id)
        console.log('Respuesta de creacioón de nota de credito alegra', createCreditNote)
        return createCreditNote
      }
      if (old_status == 11 && status == 10) {
        //envio de mail de pedidos completados
        const [shipping_order] = await BigcommerceService.getShippingAddress(order_id)
        const getPickupStores = await GeneralService.getPickupStores(
          Number(Env.get('BIGCOMMERCE_CHANNEL_ID')),
          'pickup_store'
        )
        const shipping = getPickupStores.filter(pickup => pickup.title === shipping_order.shipping_method)
        if (shipping.length > 0) {
          return await new CompleteOrder({ ...shipping[0], email: shipping_order.email }).send()
        }
        return
      }
      // if (old_status == 7 && status == 14) {
      //   const OrdersControllerInstance = new OrdersController()
      //   const order = await OrdersControllerInstance.show({ params: { order_id: order_id } })
      //   const { id, staff_notes, total_inc_tax, customer_id } = order
      //   const session = staff_notes.toLowerCase() === "factura" ? `F${id}CL${customer_id}` : `B${id}CL${customer_id}`
      //   const webpay = await TransbankService.setPayment(String(id), session, String(parseInt(total_inc_tax)), `${Env.get("URL_SITE")}/purchase_validation`)
      //   const product_link = await BigcommerceService.getPriceProductByLink(order.products.url)
      //   const body_email = await EmailService.payloadEmail(order_id)
      //   const { products, ...restBody } = body_email
      //   const productsMerge = products.map(product => {
      //     const { price, ...restProduct } = product
      //     return { ...restProduct, price: product_link[product.sku] }
      //   })
      //   return await new ButtonPayment({ ...restBody, products: productsMerge, url: `${Env.get('URL_SITE')}/button-payment?url=${webpay.url}&token=${webpay.token}` }).send()
      // }
      if (status === 13) {
        return await EmailService.generate_email(order_id)
      }
    }
    return response.notFound({ message: 'Order not found' })
  }

  static async order_status_peru(request, response) {
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
        order.staff_notes?.toLowerCase() == 'boleta' || order.staff_notes?.toLowerCase() == 'factura'
          ? { value: order.staff_notes.toLowerCase() }
          : await BigcommerceService.getIdMetafieldByOrder(order_id, 'document_type')
      if (status == 12) {
        const isGiftCard = order.payment_method.toLowerCase().includes('gift')

        let bsale = await BsaleService.setBsaleDocs(order_id, isGiftCard) //cambiar staff notes, obtener metafield document_type id 68
        if (bsale.status == 200) {
          const urbano = await UrbanoService.setOrder(String(order_id))
          console.log('urbano', urbano)
          BigcommerceService.setMetafieldByOrder({ id: order_id }, String(bsale.message.id), 'ct_order_id', 'order_id')
          OrdersControllerInstance.update({
            params: {
              status: Env.get('VERIFY_CODE_STATUS_PAYMENT'),
              order_id: order_id,
              token: bsale.message.urlPdf,
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
        let bsale = await BsaleService.setBsaleReturnDocsPeru(
          order_id,
          parseInt(document_id_bsale.value),
          type_document.value
        ) //cambiar staff notes, obtener metafield document_type id 68
        return bsale
      }
      if (old_status == 11 && status == 10) {
        //envio de mail de pedidos completados
        const [shipping_order] = await BigcommerceService.getShippingAddress(order_id)
        const getPickupStores = await GeneralService.getPickupStores(
          Number(Env.get('BIGCOMMERCE_CHANNEL_ID')),
          'pickup_store'
        )
        const shipping = getPickupStores.filter(pickup => pickup.title === shipping_order.shipping_method)
        if (shipping.length > 0) {
          return await new CompleteOrder({ ...shipping[0], email: shipping_order.email }).send()
        }
        return
      }
      // if (old_status == 7 && status == 14) {
      //   const OrdersControllerInstance = new OrdersController()
      //   const order = await OrdersControllerInstance.show({ params: { order_id: order_id } })
      //   const { id, staff_notes, total_inc_tax, customer_id } = order
      //   const session =
      //     staff_notes.toLowerCase() === 'factura'
      //       ? `F${id}CL${customer_id}`
      //       : `B${id}CL${customer_id}`
      //   const webpay = await TransbankService.setPayment(
      //     String(id),
      //     session,
      //     String(parseInt(total_inc_tax)),
      //     `${Env.get('URL_SITE')}/purchase_validation`
      //   )
      //   const product_link = await BigcommerceService.getPriceProductByLink(order.products.url)
      //   const body_email = await EmailService.payloadEmail(order_id)
      //   const { products, ...restBody } = body_email
      //   const productsMerge = products.map((product) => {
      //     const { price, ...restProduct } = product
      //     return { ...restProduct, price: product_link[product.sku] }
      //   })
      //   return await new ButtonPayment({
      //     ...restBody,
      //     products: productsMerge,
      //     url: `${Env.get('URL_SITE')}/button-payment?url=${webpay.url}&token=${webpay.token}`,
      //   }).send()
      // }
      if (status === 13) {
        return await EmailService.generate_email(order_id)
      }
    }
    return response.notFound({ message: 'Order not found' })
  }
}

export default WebhookService
