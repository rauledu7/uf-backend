import Env from '@ioc:Adonis/Core/Env'
import { Invoice } from 'App/Interfaces/Alegra/AlegraInterfaces'
import axios from 'axios'
import moment from 'moment'
import InvoicesAlegra from '../../Models/InvoicesAlegra'
import BigcommerceService from '../BigcommerceService'
import ClientAlegraService from './ClientsAlegraService'

//IMPORTANTE: Para la creacion de facturas en la APi de Alegra se debe validar la existencia de los datos del cliente en la API, dado que el ID del cliente es un campo requerido en la creción de de facturas, si el cliente no está registrado en el sistema de Alegra se debe crear ese contacto u/o cliente por medio de la API para poder conocer su id.
class AlegraService extends ClientAlegraService {
  protected URL_GET_INVOICE = 'https://api.alegra.com/api/v1/invoices' // GET <-- RECIBE COMO PARAMETRO EL ID DE LA FACTURA
  protected URL_CREATE_INVOICE = 'https://api.alegra.com/api/v1/invoices' // POST
  protected URL_DELETE_INVOICE = 'https://api.alegra.com/api/v1/invoices' // DELETE <-- RECIBE COMO PARAMETRO EL ID DE LA FACTURA
  protected URL_CANCEL_INVOICE = 'https://api.alegra.com/api/v1/invoices' // POST <-- RECIBE COMO PARAMETRO EL ID DE LA FACTURA
  protected URL_CREATE_CREDIT_NOTES = 'https://api.alegra.com/api/v1/credit-notes' // POST
  protected URL_GET_PRODUCT = 'https://api.alegra.com/api/v1/items'
  protected URL_DELETE_PAYMENT_INVOICE = 'https://api.alegra.com/api/v1/payments'
  protected API_TOKEN = Env.get('TOKEN_ALEGRA')
  protected IVA = Number(Env.get('IVA'))

  constructor() {
    super()
  }

  /**
   * Metodo principal para la creación de factura en la Api de Alegra
   */
  async createDocs(order_id: number) {
    try {
      // busqueda del metafield que contiene el tipo de documento de identidad
      const getdocumentType = await BigcommerceService.getIdMetafieldByOrder(order_id, 'identification_type')
      const documentType = getdocumentType?.value || 'cedula de ciudadania'
      const order = await BigcommerceService.getOrderById(order_id)
      const products = await BigcommerceService.getProductsByOrder(order_id)

      const details_products = await this.getDetailsProductsForAlegra(products, order.shipping_cost_inc_tax)

      console.log('detalle de productos', details_products)
      const idClient = await this.handlerClientAlegra(order, documentType)
      //console.log('idClient', idClient)
      const invoiceData = this.buildInvoiceData(order, details_products as any, idClient)
      console.log(invoiceData)
      const createInvoice = await this.createInvoice(order_id, invoiceData)
      if (createInvoice.status == 200 && createInvoice?.message?.id) {
        const saveInvoice = await this.saveInvoiceDatabse(createInvoice, order_id)
        if (saveInvoice instanceof InvoicesAlegra) {
          console.log('✅ Datos de la Factura guardadas en base de Datos', saveInvoice.toJSON())
        } else {
          console.log(saveInvoice)
        }
      }
      return createInvoice
    } catch (error) {
      console.error('⚠️ Error al crear factura en Alegra:', error.message)
      return {
        status: error.status || 400,
        message: error.message || error?.response?.data || 'No se pudo crear la factura en Alegra.'
      }
    }
  }
  /**
   * Obtener detalles de los productos ajustados para Alegra
   */
  public async getDetailsProductsForAlegra(products: any[], shipping_cost: string) {
    try {
      const arrayProducts: any[] = []
      const iva = this.IVA
      const id_tax = Env.get('ALEGRA_ID_TAX')

      const [service_shipping] = await this.getProductAlegra('111111111111')

      const shipping = {
        id: service_shipping.id,
        price: parseFloat(shipping_cost),
        quantity: 1,
        tax: [{ id: service_shipping.tax[0].id }]
      }

      await Promise.all(
        products.map(async product => {
          if (!product.name.toLowerCase().includes('armado') && !product.name.toLowerCase().includes('contraentrega')) {
            // const price_without_iva = parseFloat(product.price_ex_tax) / (1 + iva)
            let price_without_iva = product.applied_discounts.length
              ? (parseFloat(product.total_inc_tax) - parseFloat(product.applied_discounts[0].amount)) /
                (1 + iva) /
                product.quantity
              : parseFloat(product.price_ex_tax) / (1 + iva)
            const [productIdAlegra] = await this.getProductAlegra(product.sku)

            arrayProducts.push({
              id: productIdAlegra.id,
              reference:product.sku,
              price: price_without_iva.toFixed(4),
              name: product.name,
              quantity: product.quantity,
              // discount,
              tax: [{ id: productIdAlegra.tax[0]?.id || id_tax }]
            })
          } else {
            await this.handleSpecialProducts(product, arrayProducts)
          }
        })
      )

      if (parseFloat(shipping_cost) > 0) {
        arrayProducts.push(shipping)
      }

      return arrayProducts
    } catch (error) {
      throw new Error('⚠️ Hubo un error al obtener id del producto en Alegra ⚠️')
    }
  }

  /**
   * Metodo para construir los datos para la factura
   */
  private buildInvoiceData(order: any, details_products: any[], idClient: string) {
    const date_created = moment().format('YYYY-MM-DD')
    const date_due = moment().add(1, 'months').format('YYYY-MM-DD')
    return {
      date: date_created,
      dueDate: date_due,
      client: { id: idClient },
      currency: { code: Env.get('CURRENCY_ID'), exchangeRate: undefined },
      status: 'draft',
      seller: { id: Env.get('ALEGRA_SELLER') },
      items: details_products,
      payments: [
        {
          account: { id: Env.get('ID_BANK_ALEGRA') },
          date: date_created,
          amount: parseFloat(order.total_inc_tax),
          currency: { code: Env.get('CURRENCY_ID'), exchangeRate: undefined }
        }
      ],
      paymentMethod: 'MUTUAL_AGREEMENT', //this.methodPayment(payment_method),
      paymentForm: 'CASH',
      stamp: { generateStamp: true },
      operationType: 'STANDARD',
      purchaseOrderNumber: String(order.id)
    }
  }
  /**
   * Metodo para enviar los datos de creación de factura en la API de alegra.
   */
  async createInvoice(order_id: number, invoiceData: any) {
    try {
      const options = {
        method: 'POST',
        url: 'https://api.alegra.com/api/v1/invoices',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: this.API_TOKEN
        },
        data: invoiceData
      }

      const response = await axios.request(options)
      console.log('Factura creada en Alegra:', { id: order_id, response: response.data })
      return { status: 200, message: response.data }
    } catch (error) {
      console.error('⚠️ Error al enviar factura a la API Alegra:', {
        id: order_id,
        error: error.response?.data
      })
      return {
        status: error.response?.status || 500,
        message: error.response?.data || 'Error desconocido'
      }
    }
  }
  // private methodPayment(methodPayment: string) {
  //   const paymentMethod = methodPayment.toLowerCase()
  //   return paymentMethod.includes('credit')
  //     ? 'CREDIT_CARD'
  //     : paymentMethod.includes('debit')
  //     ? 'DEBIT_CARD'
  //     : paymentMethod.includes('transfer')
  //     ? 'DEBIT_TRANSFER_BANK'
  //     : 'MUTUAL_AGREEMENT'
  // }

  /**
   * Manejar productos especiales como "armado" y "contraentrega"
   */
  private async handleSpecialProducts(product: any, arrayProducts: any[]) {
    const iva = this.IVA
    const id_tax = Env.get('ALEGRA_ID_TAX')
    if (product.name.toLowerCase().includes('armado')) {
      arrayProducts.push({
        id: 682, // id del serivico de armado
        name: 'Servicio de armado',
        price: product.applied_discounts.length
          ? (parseFloat(product.total_inc_tax) - parseFloat(product.applied_discounts[0].amount)) /
            (1 + iva) /
            product.quantity
          : parseFloat(product.price_ex_tax) / (1 + iva),
        quantity: product.quantity,
        tax: [{ id: id_tax }],
        description: product.name
      })
    } else if (product.name.toLowerCase().includes('contraentrega')) {
      const [contraentrega_service] = await this.getProductAlegra('111111111112')

      arrayProducts.push({
        id: contraentrega_service.id,
        price: product.applied_discounts.length
          ? (parseFloat(product.total_inc_tax) - parseFloat(product.applied_discounts[0].amount)) /
            (1 + iva) /
            product.quantity
          : parseFloat(product.price_ex_tax) / (1 + iva),
        quantity: 1,
        tax: [{ id: contraentrega_service.tax[0].id }]
      })
    }
  }

  /**
   * Obtener producto desde la api de Alegra por SKU
   */
  private async getProductAlegra(sku: string) {
    try {
      const options = {
        method: 'GET',
        url: `${this.URL_GET_PRODUCT}?reference=${sku}`,
        headers: {
          accept: 'application/json',
          authorization: this.API_TOKEN
        }
      }

      const results = await axios.request(options)
      return results.data
    } catch (error) {
      console.error('⚠️ Error al obtener producto de la API de Alegra:', error.message)
      throw new Error('No se pudo obtener el producto de Alegra.')
    }
  }

  /**
   * Metodo para eliminar una factura en la API de Alegra
   */
  async deleteInvoice(invoiceId: string) {
    try {
      const options = {
        method: 'DELETE',
        url: `${this.URL_DELETE_INVOICE}/${invoiceId}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: this.API_TOKEN
        }
      }

      const response = await axios.request(options)
      console.log('Factura eliminada en Alegra:', { id: invoiceId, response: response.data })
      return { status: 200, message: response.data }
    } catch (error) {
      console.error('⚠️ Error al eliminar factura en la API de Alegra:', {
        error: error.response?.data
      })
      return {
        status: error.response?.status || 500,
        message: error.response?.data || 'Error desconocido'
      }
    }
  }
  /**
   * Metodo para cancelar o anular factura de venta en la API de Alegra
   */
  async cancelInvoice(invoiceId: string) {
    try {
      const options = {
        method: 'POST',
        url: `${this.URL_CANCEL_INVOICE}/${invoiceId}/void`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: this.API_TOKEN
        }
      }

      const response = await axios.request(options)
      console.log('Factura anulada en Alegra:', { id: invoiceId, response: response.data })
      return { status: 200, message: response.data }
    } catch (error) {
      console.error('⚠️ Error al anular factura en la API de Alegra:', {
        error: error.response?.data
      })
      return {
        status: error.response?.status || 500,
        message: error.response?.data || 'Error desconocido'
      }
    }
  }
  /**
   * Metodo para consultar una factura en la API de alegra
   */
  async getInvoice(invoiceId: string | null = null) {
    try {
      const options = {
        method: 'GET',
        url: `${this.URL_GET_INVOICE}/${invoiceId === null ? '' : invoiceId}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: this.API_TOKEN
        }
      }

      const response = await axios.request(options)
      console.log('Datos de Factura  Alegra:', { id: invoiceId, response: response.data })
      return { status: 200, message: response.data }
    } catch (error) {
      console.error(' ⚠️ Error al consultar factura en la API de Alegra:', {
        error: error.response?.data
      })
      return {
        status: error.response?.status || 500,
        message: error.response?.data || 'Error desconocido'
      }
    }
  }
  /**
   * Metodo para crear nota de credito
   */
  async createCreditNotes(order_id: number) {
    try {
      const invoice = await this.getPaymentInvoice(order_id)
      // return invoice
      const infoCreditNote = await this.prepareCreditNoteFormat(invoice)
      await this.deletePaymentInvoice(invoice)
      //console.log(deletePaymentInvoice)
      // return infoCreditNote}
      const options = {
        method: 'POST',
        url: `${this.URL_CREATE_CREDIT_NOTES}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: this.API_TOKEN
        },
        data: infoCreditNote
      }

      const response = await axios.request(options)
      console.log('Datos de nota de credito Alegra:', { response: response.data })
      return { status: 200, message: response.data }
    } catch (error) {
      console.error('⚠️ Error al generar la nota de credito en la API de Alegra:', {
        error: error.response?.data
      })
      return {
        status: error.response?.status || 500,
        message: error.response?.data || 'Error desconocido'
      }
    }
  }
  async handlerClientAlegra(order, documentType) {
    try {
      const formatedDataClient = await this.formateDataClient(order, documentType)
      // console.log(formatedDataClient)
      const clientAlegra = await this.createClientAPIAlegra(formatedDataClient)
      // console.log(clientAlegra)
      const clientId =
        clientAlegra.status == 200
          ? clientAlegra.message.id
          : clientAlegra.message.contactId !== undefined
          ? clientAlegra.message.contactId
          : 1
      return clientId
    } catch (error) {
      return {
        status: error.response?.status || 500,
        message: error.response?.data || 'Error desconocido'
      }
    }
  }
  async saveInvoiceDatabse(dataInvoice, order_id) {
    try {
      const {
        id: invoice_id,
        client: { id: client_id },
        numberTemplate: { id: idTemplate },
        priceList: { id },
        total
      } = dataInvoice.message
      const saveInvoice = await InvoicesAlegra.create({
        invoice_id,
        client_id,
        template: idTemplate,
        order_id,
        list: id,
        amount: total
      })
      return saveInvoice
    } catch (error) {
      console.error('⚠️ Error al guardar la factura alegra en la base de datos:', {
        error: error.message
      })
      return {
        status: error.status || 500,
        message: error.message || 'Error desconocido'
      }
    }
  }
  public async getInvoiceDatabase(order_id: number) {
    try {
      const invoice = await InvoicesAlegra.findBy('order_id', order_id)
      if (!(invoice instanceof InvoicesAlegra) || invoice === null) {
        return false
      }
      return invoice?.toJSON()
    } catch (error) {
      console.error('Error al obtener datos de la factura de alegra en la base de datos:', {
        error: error.message
      })
      return {
        status: error.status || 500,
        message: error.message || 'Error desconocido'
      }
    }
  }
  public async getPaymentInvoice(order_id: number) {
    try {
      if (!order_id) {
        throw new Error('order_id is required')
      }
      const invoiceDB = await this.getInvoiceDatabase(order_id)
      if (!invoiceDB || 'status' in invoiceDB) {
        throw new Error('⚠️ No se encuentra la factura en la base de datos')
      }

      const infoInvoiceAlegra: any = await this.getInvoice(invoiceDB.invoice_id)
      if (infoInvoiceAlegra && infoInvoiceAlegra.status !== 200 && 'status' in infoInvoiceAlegra) {
        throw new Error('⚠️ Error al obtener la factura desde la API de alegra')
      }
      return infoInvoiceAlegra.message
    } catch (error) {
      console.error(' ⚠️ Error al obtener datos del pago de la factura alegra:', {
        error: error.message
      })
      return {
        status: error.status || 500,
        message: error.message || 'Error desconocido'
      }
    }
  }

  public async prepareCreditNoteFormat(invoiceInfo: Invoice) {
    try {
      console.log(invoiceInfo)
      const { id: id_invoice, client, total, tax: taxValue } = invoiceInfo
      const templateNumber = invoiceInfo.numberTemplate.id
      const priceList = invoiceInfo.priceList.id
      const products = invoiceInfo.items
      const productsFormated = products.map(item => {
        const { id, name, discount, price, quantity } = item
        const taxId = item.tax
        return {
          id,
          name,
          discount,
          price,
          quantity,
          tax: [{ id: taxId[0].id }]
        }
      })
      const noteCreditInfo = {
        stamp: {
          generateStamp: true
        },
        invoices: [{ id: id_invoice, amount: total, retentions: [{ id: 4, amount: taxValue }] }],

        date: moment().format('YYYY-MM-DD'),
        client: { id: client.id },
        type: 'VOID_ELECTRONIC_INVOICE',
        creditNoteOperationType: 'REFERENCE_TO_ELECTRONIC_INVOICE', // 'NO_REFERENCE_TO_ELECTRONIC_INVOICE', // 'REFERENCE_TO_ELECTRONIC_INVOICE',
        numberTemplate: {
          id: templateNumber
        },
        items: productsFormated,
        priceList: { id: priceList },
        cause:
          'Hubo un error interno en nuestros sistemas que generó facturas duplicadas en compras antiguas y recientes. En tal sentido se procede a realizar nota de crédito de las facturas asociadas, lamentamos las molestias ocasionadas.'
      }
      console.log(noteCreditInfo)
      console.log(noteCreditInfo.items)

      return noteCreditInfo
    } catch (error) {
      console.error(' ⚠️ Error al obtener datos de la factura de alegra en la base de datos:', {
        error: error.message
      })
      return {
        status: error.status || 500,
        message: error.message || 'Error desconocido'
      }
    }
  }
  public async deletePaymentInvoice(invoiceInfo: Invoice) {
    try {
      const payments = invoiceInfo.payments[0] || null
      if (payments === null) {
        throw new Error('⚠️ No se encuentra el pago de la factura')
      }
      const { id } = payments
      const options = {
        method: 'DELETE',
        url: `${this.URL_DELETE_PAYMENT_INVOICE}/${id}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: this.API_TOKEN
        }
      }

      const response = await axios.request(options)
      console.log('Pago de Factura eliminada en Alegra:', { invoice_id: invoiceInfo.id, response: response.data })
      return { status: 200, message: response.data }
    } catch (error) {
      console.error(' ⚠️ Error al eliminar el pago de la factura de alegra en la API:', {
        error: error.response.data
      })
      return {
        status: error.status || 500,
        message: error.message || 'Error desconocido'
      }
    }
  }
}

export default AlegraService
