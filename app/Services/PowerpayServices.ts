import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'

class PowerpayService {
  static async createPay(body) {
    const options = {
      method: 'POST',
      url: `${Env.get('POWERPAY_URL')}/api/merchant-transactions`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${Env.get('POWERPAY_KEY')}`
      },
      data: {
        external_id: body.orderNumber,
        callback_url: Env.get('POWERPAY_REDIRECT'),
        amount: body.amount,
        values: {
          merchant_id: Env.get('POWERPAY_MERCHANTCODE'),
          //"submerchant_id":"1234",
          //"company_name":"Around Peru",
          //"ruc":"123456789123",
          currency: 'PEN',
          document_number: body.document_number,
          document_type: body.document_type,
          first_name: body.first_name,
          last_name: body.last_name,
          email: body.email,
          country_code: '+51',
          phone_number: body.phone,
          payment_concept: body.payment_concept.join(','),
          shipping_postal_code: '15065',
          shipping_address: body.shipping_address,
          channel: 'web'
        }
      }
    }

    const postRequest = await axios
      .request(options)
      .then(function (res) {
        console.log({ powerpay: res.data })
        return { code: 200, url: res.data.redirection_url }
      })
      .catch(function (error) {
        return { code: 500, error: error.response.data?.errors }
      })

    return postRequest
  }

  static async statusOrder(body) {
    const options = {
      method: 'POST',
      url: `https://sandbox-api-pw.izipay.pe/orderinfo/v1/Transaction/Search`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        transactionId: body.transactionId,
        Authorization: `Bearer ${body.token}`
      },
      data: {
        merchantCode: Env.get('IZIPAY_MERCHANTCODE'),
        numberOrden: body.orderNumber,
        language: 'ESP'
      }
    }

    const postRequest = await axios
      .request(options)
      .then(function (res) {
        return {
          code: res.data.code,
          card_detail: { card_number: res.data.response.card.pan },
          amount: res.data.response.order.amount,
          order: res.data.response.order.orderNumber
        }
      })
      .catch(function (error) {
        return { code: 500, error: error }
      })

    return postRequest
  }
}

export default PowerpayService
