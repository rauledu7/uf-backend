import axios from 'axios'
import Env from '@ioc:Adonis/Core/Env'
import BigcommerceService from './BigcommerceService'
import DepartmentsPeru from 'App/Models/DepartmentsPeru'
import moment from 'moment'
import DistrictsPeru from 'App/Models/DistrictsPeru'
import Variant from 'App/Models/Variant'
import CategoryProduct from 'App/Models/CategoryProduct'

class UrbanoService {
  static async setOrder(order_id: string) {
    try {
      // obtener información de la orden
      const order = await BigcommerceService.getOrderById(order_id)
      const [shippingOrder] = await BigcommerceService.getShippingAddress(order_id)
      const itemsData = await BigcommerceService.getProductsByOrder(order_id)

      // validar método de envío
      // if (['tienda', 'miraflores', 'surco', 'marina'].includes(shippingOrder.shipping_method.toLowerCase())) {
      //   return {
      //     status: 200,
      //     message: `Pedido ${Env.get('VARIABLE_BRAND')}-${order_id} no enviado a urbano por ser orden con retiro en tienda`,
      //   }
      // }

      // crear detalles de productos del pedido
      const arrayPiezas = await this.buildProductsDetails(itemsData)

      if (!arrayPiezas || arrayPiezas.length === 0) {
        return
      }

      // preparar los datos de envío
      const shippingData = await this.prepareShippingData(order_id, shippingOrder)

      if (!shippingData) {
        throw new Error('No se pudo preparar los datos de envío.')
      }

      // se construye los datos de la orden
      const orderData = this.buildOrderData(order, shippingOrder, arrayPiezas, shippingData)
      console.log('data enviada ha urbano', orderData)

      // obtener token de autorización
      const token = await this.getToken()
      // enviar orden a Urbano
      const response = await this.sendOrderToUrbano(orderData, token)

      console.log('Respuesta de Urbano:', response)
      return response
    } catch (error) {
      console.error('Error al procesar la orden en urbano:', error.response.data)
      return {
        status: error.response.status,
        message: `Error al procesar la orden ${order_id} en urbano`,
        error: error.response.data
      }
    }
  }

  static async buildProductsDetails(itemsData: any[]) {
    console.log(itemsData)
    return await Promise.all(
      itemsData.map(async item => {
        if (item.name.toUpperCase().includes('ARMADO') || item.name.toUpperCase().includes('RESERVA')) {
          return null
        }

        const isReserva = await this.validateIsReserve(item.sku)
        if (isReserva) {
          console.log(`Urbano: producto${item.sku}  pertenece a reserva`)
          return null
        }

        return {
          sku_id: item.sku,
          nombre: item.name,
          cantidad: item.quantity,
          valor_venta: Number(item.total_inc_tax),
          stage: 'DSPN'
          //lote_serie: [{ numero_serie: undefined }],
        }
      })
    ).then(pieces => pieces.filter(piece => piece !== null))
  }

  static async prepareShippingData(order_id: string, shippingOrder: any) {
    const nroSeguimiento = `${Env.get('VARIABLE_BRAND')}T${order_id}`
    let [provincia, city] = shippingOrder.city.split(' - ')
    let ubigeo: string | null = null
    const search_department = await DepartmentsPeru.findBy('department', shippingOrder.state)
    const id_department = search_department ? search_department.id : null

    if (id_department !== null) {
      let getUbigeo: DistrictsPeru | null = await DistrictsPeru.query()
        .where('name', city)
        .where('id_department', id_department)
        .select('ubigeo')
        .first()
      ubigeo = getUbigeo !== null ? getUbigeo.ubigeo : null
    }

    let calle = '',
      numeroVia = '',
      interior = ''
    if (shippingOrder.street_2.length > 0) {
      ;[calle, numeroVia, interior] = shippingOrder.street_2.split('|')
    } else {
      ;[calle, numeroVia, interior] = shippingOrder.street_1.split('|')
    }

    return {
      nroSeguimiento,
      calle,
      numeroVia,
      interior,
      ubigeo,
      provincia,
      city
    }
  }

  static buildOrderData(order: any, shippingOrder: any, arrayPiezas: any[], shippingData: any) {
    if (
      shippingOrder.shipping_method.toLowerCase().includes('retiro') ||
      shippingOrder.shipping_method.toLowerCase().includes('tienda')
    ) {
      this.addressStore(shippingOrder, shippingData)
      // console.log('Datos de envío después de addressStore:', shippingOrder.state, shippingData)
    }
    return {
      storage: 'MTZ',
      numero_pedido: `${order.id}`,
      fecha_compra: moment(order.date_created).format('DD/MM/YYYY'),
      tracking_number: `${shippingData.nroSeguimiento}`,
      tipo_despacho: 'DLY',
      canal_venta: 'WEB',
      destinatario: {
        codigo: order.billing_address.zip,
        nombre: `${order.billing_address.first_name} ${order.billing_address.last_name}`,
        compania: 'Urbano Peru',
        e_mail: order.billing_address.email
      },
      tienda: {
        codigo: '',
        nombre: '',
        autorizado_recibir: {
          contacto: '', // `${order.billing_address.first_name} ${order.billing_address.last_name}`,
          documento: '' //order.billing_address.zip,
        }
      },
      direccion_entrega: {
        calle: shippingData.calle,
        numero_via: shippingData.numeroVia,
        interior: shippingData.interior,
        ubigeo: shippingData.ubigeo,
        region: shippingOrder.state,
        provincia: shippingData.provincia,
        ciudad: shippingData.city,
        codigo_postal: undefined,
        referencia: undefined,
        latitud: undefined,
        longitud: undefined
      },
      punto_entrega: {
        negocio: undefined,
        pudo_id: undefined,
        fecha_recojo: undefined
      },
      telefonos: [
        {
          tipo: 'C',
          numero: order.billing_address.phone,
          extension: '',
          pais: Env.get('COUNTRY_CODE').toLowerCase()
        }
      ],
      sku_detalle: arrayPiezas,
      servicios: {
        despacho_aereo: 'NO',
        etiquetar: 'SI',
        sameDay: 'SI'
      },
      documento_venta: [
        {
          tipo: 0,
          serie: String(order.id), // aqui debería ir  el numero de la boleta o factura
          numero: order.id,
          url_nube: '',
          imprimir: 'NO'
        }
      ],
      despacho: {
        proveedor: '20603856725',
        placa: '',
        fecha_despacho: moment(order.date_created).add(1, 'days').format('DD/MM/YYYY')
      }
    }
  }

  static async getToken() {
    try {
      const response = await axios.post(`${Env.get('URBANO_URL')}/oAuth/token`, {
        grant_type: 'client_credentials',
        client_id: Env.get('URBANO_CLIENT'),
        client_secret: Env.get('URBANO_SECRET')
      })

      if (response.status === 200) {
        return response.data.data.access_token
      } else {
        throw new Error(`Error al obtener token: ${response.status}`)
      }
    } catch (error) {
      console.error('Error al obtener token:', error.message)
      throw new Error('No se pudo obtener el token de autorización.')
    }
  }

  static async sendOrderToUrbano(orderData: any, token: string) {
    try {
      const response = await axios.post(`${Env.get('URBANO_URL')}/order`, orderData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data
    } catch (error) {
      console.error('Error al enviar orden a Urbano:', error.message)
      throw error
    }
  }
  static async validateIsReserve(sku: string) {
    try {
      const variant = await Variant.findBy('sku', sku)
      if (variant !== null) {
        const product_id = variant.product_id

        // Verificar si el product_id está en la categoría ID_RESERVE
        const exists = await CategoryProduct.query()
          .where('product_id', product_id)
          .andWhere('category_id', Env.get('ID_RESERVE'))
          .first()

        return exists !== null // Devuelve true si existe, false si no
      }
      return false // Si no se encuentra el variant, devuelve false
    } catch (error) {
      console.error(error)
      return false // En caso de error, también devuelve false
    }
  }
  static addressStore(shippingOrder, shippingData) {
    const methodShipping = shippingOrder.shipping_method.toLowerCase()

    if (methodShipping.includes('bodega')) {
      shippingData.calle = 'Avenida Materiales'
      shippingData.numeroVia = '3049'
      shippingData.interior = 'Lima'
      shippingData.ubigeo = '150101'
      shippingOrder.state = 'Lima'
      shippingData.provincia = 'Lima'
      shippingData.city = 'Lima'
    } else if (methodShipping.includes('mall')) {
      shippingData.calle = 'Los Lirios'
      shippingData.numeroVia = '300'
      shippingData.interior = 'Lima'
      shippingData.ubigeo = '150133'
      shippingOrder.state = 'Lima'
      shippingData.provincia = 'Lima'
      shippingData.city = 'Lima'
    } else if (methodShipping.includes('miguel')) {
      shippingData.calle = 'Av. La Marina,CC Plaza San Miguel, San Miguel'
      shippingData.numeroVia = '2000-2100'
      shippingData.interior = 'San Miguel'
      shippingData.ubigeo = '150136'
      shippingOrder.state = 'Lima'
      shippingData.provincia = 'Lima'
      shippingData.city = 'Lima'
    } else if (methodShipping.includes('surco')) {
      shippingData.calle = 'Calle los Jades,Edificio Los Inkas, Santiago de Surco'
      shippingData.numeroVia = '109'
      shippingData.interior = 'Santiago de Surco'
      shippingData.ubigeo = '150140'
      shippingOrder.state = 'Lima'
      shippingData.provincia = 'Lima'
      shippingData.city = 'Lima'
    } else if (methodShipping.includes('miraflores')) {
      shippingData.calle = 'Calle General Recavarren,Miraflores'
      shippingData.numeroVia = '121'
      shippingData.interior = 'Miraflores'
      shippingData.ubigeo = '151022'
      shippingOrder.state = 'Lima'
      shippingData.provincia = 'Lima'
      shippingData.city = 'Lima'
    }
  }
}
export default UrbanoService
