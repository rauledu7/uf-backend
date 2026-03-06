import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import City from 'App/Models/City'
import BigcommerceService from './BigcommerceService'
import GeneralService from './GeneralService'
import moment from 'moment-timezone'

class SiigoService {
  static async getToken() {
    const options = {
      method: 'POST',
      url: Env.get('SIIGO_URL') + '/auth',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      data: {
        username: Env.get('SIIGO_USER'),
        access_key: Env.get('SIIGO_API_KEY')
      }
    }

    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return response.data.access_token
      })
      .catch(function (error) {
        return error
      })

    return postRequest
  }

  static async create_docs(order_id, payment_id) {
    try {
      const order = await BigcommerceService.getOrderById(order_id)
      const { billing_address } = order
      const products = await BigcommerceService.getProductsByOrder(order_id)

      const details_products = await GeneralService.getDetailsProductsForSiigo(products, order.shipping_cost_inc_tax)
      // const [city] = await City.query().whereRaw('LOWER(name) = ?', billing_address?.city.toLowerCase()).preload('department')

      // if (!city) {
      //   throw new Error('Ciudad no encontrada en la base de datos')
      // }

      // const { siigo_code, code: city_code } = city.$attributes
      // const { code: department_code } = city?.$preloaded?.department as never
      // let type = 'boleta'
      // if (session_id.charAt(0) == 'F' || session_id == 'factura') {
      //   type = 'factura'
      // }
      const date = moment().format('YYYY-MM-DD')

      // const document_type = type == 'boleta' ? Number(Env.get('SIIGO_ID_BOLETA')) : Number(Env.get('SIIGO_ID_FACTURA_ELECTRONICA'))
      // const activity = type == 'boleta' ? '' : order.billing_address.street_2
      //const identification = order.billing_address.zip.replace(/^(\d{1,8})(\d{1}|[Kk])$/, "$1-$2");
      let data: any = []
      data = {
        document: {
          id: Number(Env.get('SIIGO_ID_FACTURA_ELECTRONICA'))
        },
        date: date,
        //  number: order_id,
        customer: {
          person_type: 'Person',
          id_type: '13',
          identification: order.billing_address.zip,
          branch_office: 0,
          name: [billing_address.first_name, billing_address.last_name],
          address: {
            address: billing_address.street_1, //"Cra. 18 #79A - 42",
            city: {
              country_code: billing_address.country_iso2, //"Co",
              country_name: billing_address.country, //"Colombia",//billing_address.country,
              state_code: '11', //String(department_code),
              state_name: 'BOGOTA', //city?.department?.department,
              city_code: '11001', //String(siigo_code) || String(city_code),
              city_name: 'BOGOTA' //city?.name,
            }
          },
          phones: [
            {
              number: billing_address.phone
            }
          ],
          contacts: [
            {
              first_name: billing_address.first_name,
              last_name: billing_address.last_name,
              email: billing_address.email
            }
          ]
        },
        //"cost_center": Env.get('SIIGO_ID_CENTER'),//235,
        seller: Env.get('SIIGO_SELLER_ID'),
        stamp: {
          send: true
        },
        mail: {
          send: true
        },
        // observations: `${order_id}`,
        items: details_products,
        payments: [
          {
            id: payment_id, //payment,
            value: parseInt(order.total_inc_tax)
          }
        ],
        additional_fields: {
          purchase_order: {
            prefix: Env.get('VARIABLE_BRAND'),
            number: `${order_id}`
          }
        }
      }

      /** Logica para aplicar descuento de cupon en porcentaje a los productos y se vea reflejado en la boleta*/

      if (parseInt(order.discount_amount) > 0) {
        products.forEach(product => {
          const searchProduct = data.items.find(item => item.description == product.name)
          if (searchProduct) {
            let percentaje = (parseFloat(order.discount_amount) / parseFloat(order.subtotal_inc_tax)) * 100
            searchProduct.price = (
              parseFloat(searchProduct.price) -
              parseFloat(searchProduct.price) * (percentaje / 100)
            ).toFixed(5)
          }
        })
      }

      // if(parseInt(order.discount_amount) > 0){
      //   let objIndex = {}
      //   let totalDiscount =parseInt(order.discount_amount)
      //   products.map(product => {
      //     if(totalDiscount<0){
      //       return
      //     }

      //     if(totalDiscount > 0 && totalDiscount >parseInt(product.total_inc_tax)){
      //       totalDiscount -= parseInt(product.total_inc_tax)
      //       return objIndex[product.sku] = 100
      //     }

      //     const percentage = totalDiscount * 100 / parseInt(product.total_inc_tax)
      //     return objIndex[product.sku] = percentage.toFixed(1)
      //   })

      //   const discount_products = data.details.map( detail => ({ ...detail, discount : Number(objIndex[detail.code])}))
      //   data.details = discount_products
      // }

      const token_siigo = await this.getToken()

      const options = {
        method: 'POST',
        url: Env.get('SIIGO_URL') + '/v1/invoices',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Partner-Id': 'AquaForce',
          Authorization: `Bearer ${token_siigo}`
        },
        data: data
      }

      const postRequest = await axios
        .request(options)
        .then(function (response) {
          console.log('Siigo Docs', { id: order_id, response: response.data })
          return { status: 200, message: response.data }
        })
        .catch(function (error) {
          console.error('Siigo Error Docs', { id: order_id, error })
          return { status: error.response.status, message: error.response.data }
        })

      return postRequest
    } catch (error) {
      console.error(error)
      return { status: error.status || 500, error: 'Bad request', message: error.message }
    }
  }

  static async setReturnDocs(document_id) {
    let data: any = []
    let details: any = []

    // Obtener la fecha actual
    const date = new Date()
    const date_created = new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
      .format(date)
      .split('/')
      .reverse()
      .join('-')
    //obtener detalle del documento
    const { items, payments } = await SiigoService.getDetailsDocument(document_id)
    const [payment] = payments

    if (items && items.length > 0) {
      items.map(function (elem, _index) {
        let [tax] = elem.taxes
        details.push({
          code: elem.code,
          description: elem.description,
          taxes: [
            {
              id: tax.id
            }
          ],
          quantity: elem.quantity,
          price: elem.price
        })
      })
    }

    data = {
      document: {
        id: Env.get('ID_NOTA_CREDITO_SIIGO')
      },
      date: date_created,
      invoice: document_id,
      reason: 2,
      items: details,
      payments: [
        {
          id: payment.id,
          value: payment.value
        }
      ]
    }
    const token_siigo = await this.getToken()
    const options = {
      method: 'POST',
      url: Env.get('SIIGO_URL') + '/v1/credit-notes',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Partner-Id': 'AquaForce',
        Authorization: `Bearer ${token_siigo}`
      },
      data: data
    }

    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error }
      })

    return postRequest
  }

  static async getDetailsDocument(siigo_invoice_id) {
    const token_siigo = await this.getToken()
    const results = await axios.get(Env.get('SIIGO_URL') + '/v1/invoices/' + siigo_invoice_id, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Partner-Id': 'AquaForce',
        Authorization: `Bearer ${token_siigo}`
      }
    })
    let items = results.data

    return items
  }
}

export default SiigoService
