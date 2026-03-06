import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import moment from 'moment'
import BigcommerceService from './BigcommerceService'
// import ProductService from './ProductService'
import CatalogSafeStock from 'App/Models/CatalogSafeStock'

class GetpointService {
  static async setOrder(order_id) {
    const order = await BigcommerceService.getOrderById(order_id)
    const shipping = await BigcommerceService.getShippingAddress(order_id)
    const products = await BigcommerceService.getProductsByOrder(order_id)
    let original_date = moment(order.date_created)
    let date_created = original_date.format('DD-MM-YYYY')
    let actual_date = moment().format('DD-MM-YYYY')
    let data: any = []
    let arrayProducts: any = []
    const armed_service: any = []

    let document =
      order.external_order_id == 'boleta'
        ? Number(Env.get('ID_BOLETA_GETPOINT'))
        : Number(Env.get('ID_FACTURA_GETPOINT')) //obtener metafield document_type id 68

    await Promise.all(
      products.map(async function (elem, _index) {
        console.log(elem)
        if (elem.product_id === 0) {
          armed_service.push(elem.name)
          return
        }
        let pr = await BigcommerceService.getProductSingle(elem.product_id)
        let categories = pr.categories
        let reserve = categories.includes(Number(Env.get('ID_RESERVE')))
        // let reserve: any = false

        // if (elem.option_set_id == null) {
        //   if (categories.includes(Number(Env.get('ID_RESERVE')))) {
        //     reserve = true
        //   } else {
        //     reserve = false
        //   }
        // } else {
        //   reserve = await ProductService.getDateReserveByVariant(elem.sku)
        // }

        // let reserve = elem.option_set_id != null ? categories.includes(Number(Env.get('ID_RESERVE'))) ? await ProductService.getDateReserveByVariant(elem.sku) : false
        //console.log('reserve', reserve)
        const container = reserve ? await CatalogSafeStock.findBy('sku', elem.sku) : ''
        let returnProducts = {
          codigoArticulo: elem.sku,
          unidadVenta: 'UN',
          ...(reserve && container !== null && container !== '' && container?.bin_picking_number?.trim()
            ? { numeroSerie: container.bin_picking_number }
            : {}),
          ...(reserve && container && container?.bin_picking_number?.trim() ? { fechaVectoLote: actual_date } : {}),
          cantidad: elem.quantity,
          estado: reserve ? 10 : 1,
          costoUnitario: parseFloat(elem.total_ex_tax),
          kilosTotales: parseFloat(elem.weight),
          porcQa: 0,
          maquila: 0,
          pallet: '0',
          itemReferencia: 1
        }
        arrayProducts.push(returnProducts)
      })
    )

    console.log(arrayProducts)

    data = {
      proceso: 'INT-SOL_INGRESOS',
      empid: 1,
      tipoSolicitud: parseInt(Env.get('GETPOINT_STORE_ID')),
      tipoReferencia: 'ECOMM',
      numeroReferencia: order_id.toString(),
      fechaReferencia: date_created,
      fechaProceso: actual_date,
      tipoDocumento: Env.get('NODE_ENV') == 'development' ? 206 : document,
      numeroDocto: order_id.toString(),
      fechaDocto: date_created,
      glosa: armed_service ? `${shipping[0].shipping_method} - (${armed_service})` : shipping[0].shipping_method,
      cliente: order.billing_address.zip,
      razonSocial: order.billing_address.company,
      telefono: order.billing_address.phone,
      email: order.billing_address.email,
      direccion: shipping.length > 0 ? shipping[0].street_2 : order.billing_address.street_1,
      contacto: order.billing_address.first_name + ' ' + order.billing_address.last_name,
      rutaDespacho: 1,
      region: shipping.length > 0 ? shipping[0].state : order.billing_address.state,
      comuna: shipping.length > 0 ? shipping[0].city : order.billing_address.city,
      ciudad: shipping.length > 0 ? shipping[0].state : order.billing_address.state,
      vendedor: 'WEB/' + order.payment_method,
      items: arrayProducts
    }

    console.log(data)

    const options = {
      method: 'POST',
      url: Env.get('URL_GETPOINT'),
      headers: {
        'Content-Type': 'application/json',
        'X-GPOINT-API-TOKEN': Env.get('PUBLIC_KEY_GETPOINT'),
        'X-GPOINT-API-SECRET': Env.get('PRIVATE_KEY_GETPOINT')
      },
      data: data,
      validateStatus: function () {
        return true
      }
    }

    console.log(options)

    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        console.log(error)
        return { status: error.response.status, message: error }
      })

    return postRequest
  }
}

export default GetpointService
