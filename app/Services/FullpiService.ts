import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import moment from 'moment'
import BigcommerceService from './BigcommerceService'
import ProductService from './ProductService'

class FullpiService {
  static async setOrder(order_id) {
    try {
      const order = await this.getOrderDetails(order_id)
      const products = await this.getFilteredProducts(order_id)
      const productDetails = this.buildProductDetails(products)
      const data = this.buildOrderData(order, productDetails)
      console.log('Datos enviados a Fullpi: ', data)
      return await this.sendDataToFullpi(data)
    } catch (error) {
      console.error('Error en setOrder:', error)
      return error.message
    }
  }

  static async getFilteredProducts(order_id) {
    const products = await BigcommerceService.getProductsByOrder(order_id)
    return Promise.all(
      products
        .filter(
          product =>
            !product.name.toLowerCase().includes('armado') && !product.name.toLowerCase().includes('contraentrega')
        )
        .map(async elem => {
          const productInfo = await ProductService.getInfoByVariant(elem.sku)
          return {
            ...productInfo,
            quantity: elem.quantity
          }
        })
    )
  }
  static async getOrderDetails(order_id) {
    const order = await BigcommerceService.getOrderById(order_id)
    return {
      ...order,
      shipping: await BigcommerceService.getShippingAddress(order_id)
    }
  }
  static buildProductDetails(products) {
    return products.map(elem => {
      const pack: any = []
      if (elem.pack.length > 0) {
        const itemPack = elem.pack.map(item => ({
          sku: item.sku,
          cantidad: elem.quantity * item.quantity,
          lote: elem.isReserve ? elem.bin_picking_number : null,
          reservado: elem.isReserve ? 10 : 1,
          date_reserve: elem.isReserve ? elem.reserve : null
        }))
        pack.push(...itemPack)
      }
      return {
        sku: elem.sku,
        cantidad: elem.quantity,
        lote: elem.isReserve ? elem.bin_picking_number : null,
        reservado: elem.isReserve ? 10 : 1,
        ...(elem.pack.length > 0 ? { bundle: '1' } : {}),
        ...(elem.pack.length > 0 ? { products: pack } : {}),
        date_reserve: elem.isReserve ? elem.availability_description : null
      }
    })
  }
  static buildOrderData(order, productDetails) {
    const { billing_address, date_created, shipping = [] } = order
    const shippingData = shipping.length > 0 ? shipping[0] : null
    const data = {
      date_created: moment(date_created).format('YYYY-MM-DD HH:MM:SS'),
      idOrden: String(order.id),
      linea: Env.get('VARIABLE_BRAND'),
      buyer_Id_First_Name: billing_address.first_name,
      buyer_Id_Last_Name: billing_address.last_name,
      buyer_Id_Email: billing_address.email,
      buyer_Id_Phone_Number: billing_address?.phone,
      buyer_Address_Street_Name: billing_address?.street_1 || '',
      buyer_Address_City_Name: billing_address.city || '',
      buyer_Address_State_Name: billing_address.state || shipping.state,
      buyer_Address_Country_Name: billing_address.country || '',
      buyer_Id_Billing_Doc_Type: 'NIT',
      buyer_Id_Billing_Doc_Number: billing_address.zip,
      total_Order_Amount: order.total_inc_tax,
      payment_Type: order.payment_method || '',
      receiver_Id_Doc_Number: shippingData.zip || '',
      receiver_Id_First_Name: shippingData.first_name || '',
      receiver_Id_Last_Name: shippingData.last_name || '',
      receiver_Id_Email: shippingData.email || billing_address.email,
      receiver_Id_Phone_Number: shippingData?.phone || billing_address?.phone || '',
      receiver_Address_Street_Name: shippingData?.street_1 || shippingData?.street_2 || '',
      receiver_Address_City_Name: shippingData.city || '',
      receiver_Address_State_Name: shippingData.state || '',
      receiver_Address_Country_Name: shippingData.country || '',
      shipping_method:
        shippingData.shipping_method.toLowerCase().includes('retiro') ||
        shippingData.shipping_method.toLowerCase().includes('tienda')
          ? 'Pickup Store'
          : 'Normal',
      products: productDetails // Listado de productos de la compra con estructura de fullpi
    }
    return [{ ...data }]
  }
  static async sendDataToFullpi(data) {
    const options = {
      method: 'POST',
      url: Env.get('URL_FULLPI'),
      headers: {
        'Content-Type': 'application/json'
      },
      data: data
    }

    try {
      const response = await axios.request(options)
      return {
        status: 200,
        message: response.data
      }
    } catch (error) {
      const status = error.response ? error.response.status : 500
      const message = error.response ? error.response.data : 'Error desconocido'
      return { status, message }
    }
  }
}

export default FullpiService
