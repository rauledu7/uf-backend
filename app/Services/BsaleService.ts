import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import moment from 'moment-timezone'
import BigcommerceService from './BigcommerceService'
import DiscountService from './DiscountService'
// import moment from 'moment'
class BsaleService extends DiscountService {
  static IVA_CL = 0.19
  static IVA_PE = 0.18
  static async setBsaleDocs(order_id, isGiftCard = false) {
    const order = await BigcommerceService.getOrderById(order_id)
    const products = await BigcommerceService.getProductsByOrder(order_id)
    const country = order.billing_address.country_iso2 // CL o PE
    const IVA = country == 'CL' ? this.IVA_CL : this.IVA_PE
    const typeMethodPayment = this.getTypePaymentMethod(order.payment_method) // MERCADOPAGO - LINLIFY - GIFT CARD
    const discountAmount = parseFloat(order.discount_amount)
    const couponName = order.ip_address
    const subTotalAmount = parseFloat(order.subtotal_inc_tax)
    let details_products = this.detailsProductsForBsale(products, IVA, isGiftCard)

    if (discountAmount > 0) {
      details_products = this.handleDiscountTypes({
        subTotalAmount,
        couponName,
        products: details_products,
        discountAmount,
        valueIVA: IVA
      })
    }

    // console.log('detalles de porductos',details_products); // logs details_products

    // si agrega la estructura de los datos de costos de envío al detalle de productos
    const shippingPrice = Number(order.shipping_cost_inc_tax)
    if (shippingPrice > 0) {
      const shipping = this.detailsShippingForBsale(shippingPrice, IVA)
      details_products.push(shipping)
    }

    let type = order.external_order_id // boleta o factura

    const date_created =
      country == 'CL' ? Math.floor(new Date().getTime() / 1000) : moment.tz('America/Lima').subtract(5, 'hours').unix()
    const document_type = type == 'boleta' ? Number(Env.get('ID_BOLETA_BSALE')) : Number(Env.get('ID_FACTURA_BSALE'))
    const activity = type == 'boleta' ? '' : order.billing_address.street_2
    const code = order.billing_address.zip.replace(/^(\d{1,8})(\d{1}|[Kk])$/, '$1-$2')
    let data: any = []
    data = {
      documentTypeId: document_type, //chile y peru
      officeId: Env.get('OFFICE_ID'), //chile y peru
      emissionDate: date_created, //chile y peru
      expirationDate: date_created, //chile y peru
      declareSii: 1, //chile
      details: details_products, //chile y peru

      ...(country == 'CL'
        ? {
            sellerId: Env.get('SELLER_ID_BSALE'), // Chile
            salesId: order_id.toString() // Chile
          }
        : {}),
      ...(country == 'PE'
        ? {
            dispatch: 1, // Peru
            declare: 1 // Peru
          }
        : {}),

      payments: [
        {
          paymentTypeId: typeMethodPayment,
          amount: order.total_inc_tax,
          recordDate: date_created
        }
      ],
      client: {
        firstName: order.billing_address.first_name,
        lastName: order.billing_address.last_name,
        code: code,
        city: order.billing_address.state,
        company: order.billing_address.company,
        municipality: order.billing_address.city,
        activity: activity,
        address: order.billing_address.street_1,
        email: order.billing_address.email,
        companyOrPerson: type === 'factura' ? 1 : 0
      },
      dynamicAttributes: [
        {
          description: order_id.toString(),
          dynamicAttributeId:
            type === 'factura'
              ? Number(Env.get('ID_DYNAMIC_ATTRIBUTE_FACTURA_BSALE'))
              : Number(Env.get('ID_DYNAMIC_ATTRIBUTE_BOLETA_BSALE'))
        }
      ]
    }
    const options = {
      method: 'POST',
      url: Env.get('URL_BSALE') + 'documents.json',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        access_token: Env.get('TOKEN_BSALE')
      },
      data: data,
      validateStatus: function () {
        return true
      }
    }
    console.log('data for bsale', data) // logs the data bsale
    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error }
      })

    return postRequest
  }

  static async setBsaleReturnDocs(order_id, bsale_id, document_type) {
    let data: any = []
    let details: any = []
    // Obtener la fecha actual
    const actual_date = new Date()
    // Convertir la fecha y hora a timestamp
    const timestamp = Math.floor(new Date(actual_date).getTime() / 1000)
    const order = await BigcommerceService.getOrderById(order_id)
    let type = 'boleta'
    if (document_type.charAt(0) == 'F' || document_type == 'factura') {
      type = 'factura'
    }
    const activity = type == 'boleta' ? '' : order.billing_address.street_2
    //obtener detalle del documento
    const details_document = await BsaleService.getDetailsDocument(bsale_id)

    if (details_document && details_document.count > 0) {
      Promise.all(
        details_document.items.map(function (elem, _index) {
          let detail_data = { documentDetailId: elem.id, quantity: elem.quantity, unitValue: 0 }
          details.push(detail_data)
        })
      )
    }

    data = {
      documentTypeId: Number(Env.get('ID_NOTA_CREDITO_BSALE')),
      officeId: Env.get('OFFICE_ID'),
      referenceDocumentId: bsale_id,
      expirationDate: timestamp,
      emissionDate: timestamp,
      motive: 'NC para DTE  pedido #' + bsale_id,
      declareSii: 1,
      salesId: order_id.toString(),
      priceAdjustment: 0,
      editTexts: 0,
      type: 0,
      client: {
        code: order.billing_address.zip,
        city: order.billing_address.state,
        municipality: order.billing_address.city,
        activity: activity,
        address: order.billing_address.street_1
      },
      details: details
    }

    const options = {
      method: 'POST',
      url: Env.get('URL_BSALE') + 'returns.json',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        access_token: Env.get('TOKEN_BSALE')
      },
      data: data,
      validateStatus: function () {
        return true
      }
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

  static async getDetailsDocument(bsale_id) {
    const results = await axios.get(Env.get('URL_BSALE') + 'documents/' + bsale_id + '/details.json', {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        access_token: Env.get('TOKEN_BSALE')
      }
    })
    let data = results.data

    return data
  }

  static async getOfficesBsale() {
    try {
      const url = Env.get('URL_BSALE') + 'offices.json'
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        access_token: Env.get('TOKEN_BSALE')
      }

      const response = await axios.get(url, { headers })

      if (response.status === 200) {
        return response.data
      } else {
        throw new Error('Error en la solicitud' + response.status)
      }
    } catch (error) {
      // Manejar el error de manera adecuada, por ejemplo:
      console.error('Error en la solicitud:', error.message)
      throw error
    }
  }

  static async getStoresStockByProduct(sku) {
    try {
      const url = Env.get('URL_BSALE') + 'stocks.json?code=' + sku
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        access_token: Env.get('TOKEN_BSALE')
      }

      const response = await axios.get(url, { headers })

      if (response.status === 200) {
        return response.data
      } else {
        throw new Error('Error en la solicitud' + response.status)
      }
    } catch (error) {
      // Manejar el error de manera adecuada, por ejemplo:
      console.error('Error en la solicitud:', error.message)
      throw error
    }
  }

  static async setBsaleReturnDocsPeru(order_id, bsale_id, document_type) {
    let data: any = []
    let details: any = []
    // Obtener la fecha actual
    const actual_date = new Date()
    // Convertir la fecha y hora a timestamp
    const timestamp = Math.floor(new Date(actual_date).getTime() / 1000)
    const order = await BigcommerceService.getOrderById(order_id)
    let type = 'boleta'
    if (document_type.charAt(0) == 'F' || document_type == 'factura') {
      type = 'factura'
    }
    const activity = type == 'boleta' ? '' : order.billing_address.street_2
    //obtener detalle del documento
    const details_document = await BsaleService.getDetailsDocument(bsale_id)

    if (details_document && details_document.count > 0) {
      Promise.all(
        details_document.items.map(function (elem, _index) {
          let detail_data = { documentDetailId: elem.id, quantity: elem.quantity, unitValue: 0 }
          details.push(detail_data)
        })
      )
    }

    data = {
      documentTypeId: Number(Env.get('ID_NOTA_CREDITO_BSALE')),
      officeId: Env.get('OFFICE_ID'),
      referenceDocumentId: bsale_id,
      expirationDate: timestamp,
      emissionDate: timestamp,
      motive: 'NC para DTE  pedido #' + bsale_id,
      declareSii: 1,
      priceAdjustment: 0,
      editTexts: 0,
      type: 0,
      client: {
        firstName: order.billing_address.first_name,
        lastName: order.billing_address.last_name,
        code: order.billing_address.zip,
        city: order.billing_address.state,
        municipality: order.billing_address.city,
        activity: activity,
        address: order.billing_address.street_1
      },
      details: details
    }

    const options = {
      method: 'POST',
      url: Env.get('URL_BSALE') + 'returns.json',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        access_token: Env.get('TOKEN_BSALE')
      },
      data: data,
      validateStatus: function () {
        return true
      }
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
  static async createBulkDocumentBsale(order_id, payment, token, seller_id) {
    const order = await BigcommerceService.getOrderById(order_id)
    const products = await BigcommerceService.getProductsByOrder(order_id)
    const country = order.billing_address.country_iso2
    const IVA = country == 'CL' ? this.IVA_CL : this.IVA_PE
    const discountAmount = parseFloat(order.discount_amount)
    const couponName = order.ip_address
    const subTotalAmount = parseFloat(order.subtotal_inc_tax)
    let type = order.external_order_id //boleta o factura

    let details_products = this.detailsProductsForBsale(products, IVA)
    console.log(details_products)
    if (discountAmount > 0) {
      details_products = this.handleDiscountTypes({
        subTotalAmount,
        couponName,
        products: details_products,
        discountAmount,
        valueIVA: IVA
      })
    }

    // console.log('detalles de porductos',details_products); // logs details_products

    // si agrega la estructura de los datos de costos de envío al detalle de productos
    const shippingPrice = Number(order.shipping_cost_inc_tax)
    if (shippingPrice > 0) {
      const shipping = this.detailsShippingForBsale(shippingPrice, IVA)
      details_products.push(shipping)
    }

    const date_created =
      country == 'CL'
        ? moment.tz('America/Santiago').subtract(5, 'hours').unix()
        : moment.tz('America/Lima').subtract(5, 'hours').unix()
    const document_type =
      type == 'boleta' && country == 'CL'
        ? Number(Env.get('ID_BOLETA_BSALE'))
        : type !== 'boleta' && country == 'CL'
        ? Number(Env.get('ID_FACTURA_BSALE'))
        : type == 'boleta' && country == 'PE'
        ? '1'
        : '5'
    const activity = type == 'boleta' ? '' : order.billing_address.street_2
    const code = order.billing_address.zip.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1-$2-$3')

    let data: any = []
    data = {
      documentTypeId: document_type, //chile y peru
      officeId: country == 'CL' ? Env.get('OFFICE_ID') : 1, //chile y peru
      emissionDate: date_created, //chile y peru
      expirationDate: date_created, //chile y peru
      declareSii: 1, //chile
      details: details_products, //chile y peru

      ...(country == 'CL'
        ? {
            sellerId: seller_id, // Chile
            salesId: order_id.toString() // Chile
          }
        : {}),
      ...(country == 'PE'
        ? {
            dispatch: 1, // Peru
            declare: 1 // Peru
          }
        : {}),

      payments: [
        {
          paymentTypeId: payment,
          amount: order.total_inc_tax,
          recordDate: date_created
        }
      ],
      client: {
        firstName: order.billing_address.first_name,
        lastName: order.billing_address.last_name,
        code: code,
        city: order.billing_address.state,
        company: order.billing_address.company,
        municipality: order.billing_address.city,
        activity: activity,
        address: order.billing_address.street_1,
        email: order.billing_address.email,
        companyOrPerson: type === 'factura' ? 1 : 0
      },
      dynamicAttributes: [
        {
          description: order_id.toString(),
          dynamicAttributeId:
            type === 'factura'
              ? 22
              : type === 'boleta' && country == 'CL'
              ? 5
              : type === 'factura' && country == 'PE'
              ? 39 // ID_DYNAMIC_ATTRIBUTE_FACTURA_BSALE
              : 38 // ID_DYNAMIC_ATTRIBUTE_BOLETA_BSALE
        }
      ]
    }

    const options = {
      method: 'POST',
      url: Env.get('URL_BSALE') + 'documents.json',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        access_token: token
      },
      data: data,
      validateStatus: function () {
        return true
      }
    }

    let postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error, message: error.detail }
      })

    console.log(postRequest)
    return postRequest
  }
  // metodo que retorna el listado "[products]" con la estructura de bsale
  static detailsProductsForBsale(products, iva, isGiftCard = false) {
    let detailsProducts = products.map(elem => {
      let price_without_iva = parseFloat(elem.price_ex_tax) / (1 + iva)
      let discountAmount =
        elem.applied_discounts.length && !isGiftCard ? parseFloat(elem.applied_discounts[0].amount) : 0
      let discountPercentage =
        discountAmount > 0 ? (discountAmount / (parseFloat(elem.price_ex_tax) * elem.quantity)) * 100 : 0
      return {
        ...(!elem.name.toLowerCase().includes('armado') ? { code: elem.sku } : {}),
        netUnitValue: price_without_iva,
        quantity: elem.quantity,
        taxId: '[1]',
        comment: elem.name,
        discount: discountPercentage
      }
    })
    return detailsProducts
  }

  static detailsShippingForBsale(shippingPrice, iva) {
    let priceShipping = parseFloat(shippingPrice) / (1 + iva)
    const shipping = {
      netUnitValue: priceShipping,
      quantity: 1,
      taxId: '[1]',
      comment: 'Despacho'
    }
    return shipping
  }
  static getTypePaymentMethod(methodPayment: string) {
    if (!methodPayment) {
      throw new Error('Invalid payment method')
    }

    let typeMethod = methodPayment.toLowerCase().trim()
    typeMethod =
      typeMethod.includes('mercadopago') || typeMethod.includes('debit') || typeMethod.includes('credit')
        ? Env.get('PAYMENT_ID_MERCADOPAGO')
        : typeMethod.includes('linkify')
        ? Env.get('PAYMENT_ID_LINKIFY')
        : typeMethod.includes('webpay')
        ? Env.get('PAYMENT_ID_WEBPAY')
        : Env.get('PAYMENT_ID_GIFTCARD')
    return typeMethod
  }
}

export default BsaleService
