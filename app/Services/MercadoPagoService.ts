import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import mercadopago from 'mercadopago'
import { PreferencesDTO, InitPoint, OrderDTO } from 'App/Interfaces/Payments/MercadopagoInterface'
import {
  PaymentConfirmation,
  PaymentInfo,
  ServiceMercadopagoInterface
} from 'App/Interfaces/Payments/ServiceMercadopagoInterface'
import BigcommerceService from 'App/Services/BigcommerceService'
import moment from 'moment-timezone'

export default class MercadoPagoService implements ServiceMercadopagoInterface {
  public async getDataOrder(order_id: string): Promise<OrderDTO> {
    try {
      const [orderResponse, productsResponse, shippingResponse] = await Promise.all([
        BigcommerceService.getOrderById(order_id),
        BigcommerceService.getProductsByOrder(order_id),
        BigcommerceService.getShippingAddress(order_id)
      ])

      const { first_name, company, last_name, email, phone, zip, state, street_1, city } = orderResponse.billing_address

      const cost_inc_tax = shippingResponse == '' ? 0 : shippingResponse[0].cost_inc_tax
      const { discount_amount, id, subtotal_inc_tax } = orderResponse

      // se valida coincidencia entre el valor del envio y el total de la orden para detectar compras pagadas en su totalidad con giftcard
      const purchasedWithGiftCard = orderResponse.shipping_cost_inc_tax == orderResponse.total_inc_tax

      const buyWithDiscount = {
        id: id,
        title: 'Compra con descuento',
        currency_id: Env.get('CURRENCY_ID'),
        unit_price: purchasedWithGiftCard
          ? parseFloat(orderResponse.total_inc_tax)
          : parseFloat(subtotal_inc_tax) - parseFloat(discount_amount),
        quantity: 1
      }
      const productlist = productsResponse.map(product => {
        return {
          id: product.sku,
          title: product.name,
          currency_id: Env.get('CURRENCY_ID'),
          unit_price: parseInt(product.price_inc_tax),
          quantity: product.quantity
        }
      })

      const data = {
        name: first_name,
        surname: last_name,
        company: company,
        email: email,
        phone: phone,
        identification: zip,
        state: state,
        city: city,
        street: street_1,
        productInfo: parseInt(discount_amount) > 0 ? [buyWithDiscount] : productlist,
        shipping_amount: purchasedWithGiftCard ? 0 : cost_inc_tax // purchasedWithGiftCard es true el envio se deja en 0.
      }

      return data
    } catch (error) {
      throw error
    }
  }
  public async createOrderPay(order_id: string, session_id: string): Promise<InitPoint> {
    try {
      //TODO: para buscar el id de la orden y con los datos necesarios para mercadopago
      let getOrder = await this.getDataOrder(order_id)

      // Fecha actual en la zona horaria
      const expiration_date_from = this.formatDateWithTimezone(moment().tz(Env.get('TIME_ZONE')))

      // Fecha actual más 10 minutos en la zona horaria
      const expiration_date_to = this.formatDateWithTimezone(moment().tz(Env.get('TIME_ZONE')).add(10, 'minutes'))

      //TODO:configuro la conexion con mercadopago
      mercadopago.configure({
        access_token: Env.get('MERCADOPAGO_TOKEN')
      })

      //TODO:creo la estructura que pide MCP para vincular los pagos con la cta y generar los cobros.
      const createPayment: PreferencesDTO = {
        items: getOrder.productInfo,
        payer: {
          name: getOrder.name || getOrder.company,
          surname: getOrder.surname,
          email: getOrder.email,
          phone: {
            area_code: `${Env.get('AREA_CODE')}`,
            number: Number(getOrder.phone)
          },
          identification: {
            number: getOrder.identification,
            type: `${Env.get('TYPE_IDENTIFICATION')}`
          },
          address: {
            street_name: `${getOrder.state} ${getOrder.city} ${getOrder.street}`
          }
        },
        back_urls: {
          success: `${Env.get('API_URL')}/mercadopago/success-payment/${session_id}`,
          failure: `${Env.get('API_URL')}/mercadopago/failure-payment/${session_id}`,
          pending:
            Env.get('COUNTRY_CODE') == 'CO' ? `${Env.get('API_URL')}/mercadopago/pending-payment/${session_id}` : ''
        },
        auto_return: 'approved',
        payment_methods: {
          excluded_payment_types:
            Env.get('COUNTRY_CODE') == 'PE' || Env.get('COUNTRY_CODE') == 'CL'
              ? [
                  {
                    id: 'ticket'
                  },
                  {
                    id: 'bank_transfer'
                  }
                ]
              : [],
          installments: Number(Env.get('MERCADOPAGO_CUOTAS'))
        },
        notification_url:
          Env.get('COUNTRY_CODE') == 'CO' || Env.get('COUNTRY_CODE') == 'CL'
            ? `${Env.get('API_URL')}/mercadopago/notification`
            : '',
        statement_descriptor: `${Env.get('TRADE_NAME')}`,
        external_reference: `${Env.get('VARIABLE_BRAND')}-${order_id}`,
        shipments: {
          cost: getOrder.shipping_amount ? Number(getOrder.shipping_amount) : 0,
          mode: 'not_specified'
        },
        expires: true,
        expiration_date_from: expiration_date_from,
        expiration_date_to: expiration_date_to,
        binary_mode: Env.get('COUNTRY_CODE') == 'CO' ? false : true
      }
      const preferences = await mercadopago.preferences.create(createPayment)
      console.log(preferences.response)
      return { go_to_pay: preferences.body.init_point }
    } catch (error) {
      console.error('Error al obtener datos de la orden: ' + error)
      throw error
    }
  }
  public async confirmPayment(paymentId: string): Promise<PaymentConfirmation> {
    try {
      const headers = {
        Authorization: `Bearer ${Env.get('MERCADOPAGO_TOKEN')}`,
        'Content-Type': 'application/json'
      }
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers
      })

      return {
        status: response.data.status,
        status_detail: response.data.status_detail,
        payment_type_id: response.data.payment_type_id,
        payment_method_id: response.data.payment_method_id,
        external_reference: response.data.external_reference
      }
    } catch (error) {
      throw error
    }
  }
  public async verifyStatusPayment(order_id: string): Promise<PaymentInfo> {
    try {
      const headers = {
        Authorization: `Bearer ${Env.get('MERCADOPAGO_TOKEN')}`,
        'Content-Type': 'application/json'
      }
      let response = await axios.get(`https://api.mercadopago.com/v1/payments/search?external_reference=${order_id}`, {
        headers
      })

      response = response.data.results.map(result => ({
        id_mercadopago: result.id,
        order: result.external_reference,
        first_name: result.additional_info.payer.first_name,
        last_name: result.additional_info.payer.last_name,
        phone: result.additional_info.payer.phone,
        status: result.status,
        status_detail: result.status_detail,
        payment_type_id: result.payment_type_id,
        payment_method_id: result.payment_method_id,
        products: result.additional_info.items.map(product => ({
          quantity: product.quantity,
          id: product.id,
          title: product.title,
          unit_price: product.unit_price
        }))
      }))
      return response[0]
    } catch (error) {
      throw error
    }
  }

  private formatDateWithTimezone(date) {
    return date.format('YYYY-MM-DDTHH:mm:ss.SSSZ').replace(/(\d{2})(\d{2})$/, '$1:$2')
  }
}
