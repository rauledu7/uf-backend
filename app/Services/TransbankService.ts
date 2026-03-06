import Env from '@ioc:Adonis/Core/Env'
import {
  Environment,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Options,
  TransactionDetail,
  WebpayPlus
} from 'transbank-sdk' // ES6 Modules

class TransbankService {
  static async setPayment(buy_order, session_id, amount, url) {
    const details = [new TransactionDetail(amount, Env.get('API_KEY_STORE_CODE_TRANSBANK'), buy_order)]

    const tx =
      Env.get('URL_SITE') == 'https://staging.ultimatefitness.cl'
        ? new WebpayPlus.MallTransaction(
            new Options(IntegrationCommerceCodes.WEBPAY_PLUS_MALL, IntegrationApiKeys.WEBPAY, Environment.Integration)
          )
        : new WebpayPlus.MallTransaction(
            new Options(
              Env.get('API_KEY_COMERCE_CODE_TRANSBANK'),
              Env.get('API_KEY_SECRET_TRANSBANK'),
              Env.get('URL_PRODUCTION_TRANSBANK')
            )
          )
    const response = await tx.create(buy_order, session_id, url, details)
    const log = {
      buy_order,
      token: response.token,
      url: response.url
    }
    console.log('CREACION DE PAGO WEBPAY', log)
    return response
  }

  static async getStatusOrder(token) {
    // Versión 3.x del SDK
    const tx =
      Env.get('URL_SITE') == 'https://staging.ultimatefitness.cl'
        ? new WebpayPlus.MallTransaction(
            new Options(IntegrationCommerceCodes.WEBPAY_PLUS_MALL, IntegrationApiKeys.WEBPAY, Environment.Integration)
          )
        : new WebpayPlus.MallTransaction(
            new Options(
              Env.get('API_KEY_COMERCE_CODE_TRANSBANK'),
              Env.get('API_KEY_SECRET_TRANSBANK'),
              Env.get('URL_PRODUCTION_TRANSBANK')
            )
          )
    const tx_status = await tx.commit(token)
    console.log(tx_status)

    const { details, ...rest } = tx_status
    const [det] = details

    const response = { ...det, ...rest }

    console.log('📋 Resultado de pago Webpay Transbank', response)

    return response
  }
}
export default TransbankService
