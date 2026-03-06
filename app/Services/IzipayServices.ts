import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'

class IzipayService {
  static async createToken(body) {
    const options = {
      method: 'POST',
      url: `${Env.get('IZIPAY_URL')}/security/v1/Token/Generate`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        transactionId: body.transactionId
      },
      data: {
        requestSource: 'ECOMMERCE',
        merchantCode: Env.get('IZIPAY_MERCHANTCODE'),
        orderNumber: body.orderNumber,
        publicKey: Env.get('IZIPAY_PUBLICKEY'),
        amount: parseFloat(body.amount).toFixed(2)
      }
    }

    const postRequest = await axios
      .request(options)
      .then(function (res) {
        return { code: 200, response: res.data.response.token }
      })
      .catch(function (error) {
        return { code: 500, error: error }
      })

    return postRequest
  }

  static async statusOrder(body) {
    const options = {
      method: 'POST',
      url: `${Env.get('IZIPAY_URL')}/orderinfo/v1/Transaction/Search`,
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
          amount: res.data.response.order[0].amount,
          order: res.data.response.order[0].orderNumber
        }
      })
      .catch(function (error) {
        return { code: 500, error: error }
      })

    return postRequest
  }
}

export default IzipayService
