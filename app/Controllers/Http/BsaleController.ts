import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import BsaleService from 'App/Services/BsaleService'
import BigcommerceService from 'App/Services/BigcommerceService'
import OrdersController from './OrdersController'
import { tokenForBsale } from 'App/Interfaces/ChannelForBsale'

export default class BsaleController {
  constructor(private readonly ordersController = new OrdersController()) {}
  public async createBsalePeru({ request, params }: HttpContextContract) {
    const { order_id } = params
    const { method = '' } = request.all()
    return await BsaleService.setBsaleDocs(order_id, method)
  }

  public async createBsaleChile({ request, params }: HttpContextContract) {
    const { order_id } = params
    const { method = '' } = request.all()
    return await BsaleService.setBsaleDocs(order_id, method)
  }

  public async createBulk({ request, response }: HttpContextContract) {
    try {
      const CHANNEL_SELLER = tokenForBsale // viene de la carpeta Interface archivo ChannelforBsale.ts este contiene los tokens bsale por marcas
      const { data } = request.body()

      if (!data.length) {
        return response.status(404).json({
          status: 404,
          message: 'No se recibió la información con los numeros de ordenes que desea gestionar'
        })
      }

      const orders = [...new Set(data)] // se eliminan numero de ordenes duplicadas
      const totalData = orders.length
      let results: any = []
      let resultsFailed: any = []

      for (const id of orders) {
        const order = await BigcommerceService.getOrderById(id)
        if (!order) continue
        const { country_iso2 } = order.billing_address
        let { external_order_id, payment_method, channel_id } = order
        external_order_id = `${external_order_id.charAt(0).toUpperCase()}${id}` // F2865 / B2865 numero de orden mas boleta o factura
        console.log(external_order_id)

        const channel = CHANNEL_SELLER.filter(item => item.channel == channel_id && item.country == country_iso2)
        const token = channel[0]?.token_channel
        const seller_id = country_iso2 == 'CL' ? channel[0]?.seller_id : null
        try {
          let ID_PAYMENT = /*payment_method.toLowerCase().includes('webpay')
            ? Env.get('PAYMENT_ID_WEBPAY')
            :*/ payment_method.toLowerCase().includes('linkify')
            ? Env.get('PAYMENT_ID_LINKIFY')
            : payment_method.toLowerCase().includes('gift')
            ? Env.get('PAYMENT_ID_GIFTCARD')
            : Env.get('PAYMENT_ID_MERCADOPAGO_CL')

          if (country_iso2 === 'PE') {
            ID_PAYMENT = Env.get('PAYMENT_ID_MERCADOPAGO_PE')
          }
          const createDoc = await BsaleService.createBulkDocumentBsale(id, ID_PAYMENT, token, seller_id)
          console.log('Respuesta de createBulkDocumentBsale:', createDoc)

          if (createDoc?.message?.error === undefined) {
            const { urlPdf, token, totalAmount } = createDoc.message
            const billing = {
              status: createDoc.status,
              order: id,
              externalOrderId: external_order_id,
              paymentMethod: payment_method,
              totalAmount,
              urlPdf: country_iso2 === 'PE' ? urlPdf : token
            }

            try {
              const updateStatusOrder = await this.ordersController.update_order(id, 11, payment_method, billing.urlPdf)
              console.log('Resultado de update_order:', updateStatusOrder)
              results.push(billing)
            } catch (error) {
              console.error('Error al actualizar la orden:', error.message)
              resultsFailed.push({
                order: id,
                message: `Error al actualizar la orden: ${error.message}`
              })
            }
          } else {
            resultsFailed.push({ order: id, message: createDoc.message.error })
          }
        } catch (error) {
          console.error('Error durante la creación del documento en Bsale:', error.message)
          resultsFailed.push({
            order: id,
            message: `Error al crear documento en Bsale: ${error.message}`
          })
        }
      }

      response.status(201).json({
        totalData,
        success: results.length,
        faileds: resultsFailed.length,
        results,
        totalSuccess: results.length,
        resultsFailed,
        totalFailed: resultsFailed.length,
        message: 'Operación realizada con éxito'
      })
    } catch (error) {
      console.error('Error general en createBulk:', error.message)
      response.status(404).json({ status: 404, message: error.message })
    }
  }
}
