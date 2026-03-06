import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BigcommerceService from 'App/Services/BigcommerceService'
import GeneralService from 'App/Services/GeneralService'
import axios from 'axios'
import Env from '@ioc:Adonis/Core/Env'
import ProductService from 'App/Services/ProductService'
import Coupon from 'App/Models/Coupon'
import Lottery from 'App/Models/Lottery'
import RoulleteCoupon from 'App/Models/RoulleteCoupon'
import { COUNTRY } from 'App/Interfaces/Countries'
import CompleteOrder from 'App/Mailers/CompleteOrder'
import StatusOrder from 'App/Models/StatusOrder'
import PaymentColombiaService from 'App/Services/PaymentColombiaServices'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
import Variant from 'App/Models/Variant'
import AlegraService from 'App/Services/Alegra/AlegraService'
import AlertWarningService from 'App/Services/AlertWarningService'
import MailchimpService from 'App/Services/MailchimpService'

export default class OrdersController {
  public async store({ request }: HttpContextContract) {
    const data_form = request.body()

    const products = await this.discountInventoryPacks(data_form.products)

    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        status_id: data_form.payment_method.toLowerCase().includes('contraentrega') ? 9 : 7,
        customer_id: data_form.user_id,
        billing_address: {
          first_name: data_form.billing_first_name,
          last_name: data_form.billing_last_name,
          street_1:
            data_form.shipping_method &&
            ['retiro', 'tienda', 'punto', 'ultimate'].some(keyword =>
              data_form.shipping_method.toLowerCase().includes(keyword)
            )
              ? data_form.shipping_method
              : data_form.billing_street,
          street_2:
            data_form.shipping_method &&
            ['retiro', 'tienda', 'punto', 'ultimate'].some(keyword =>
              data_form.shipping_method.toLowerCase().includes(keyword)
            )
              ? data_form.shipping_street
              : data_form.billing_street_2,
          company: data_form.billing_company,
          state: data_form.billing_region,
          city: data_form.billing_commune,
          zip: data_form.billing_zip,
          country: Env.get('COUNTRY'),
          country_iso2: Env.get('COUNTRY_CODE'),
          email: data_form.billing_email,
          phone: data_form.phone
        },
        shipping_addresses: [
          {
            first_name: data_form.shipping_first_name,
            last_name: data_form.shipping_last_name,
            street_1:
              data_form.shipping_method &&
              ['retiro', 'tienda', 'punto', 'ultimate'].some(keyword =>
                data_form.shipping_method.toLowerCase().includes(keyword)
              )
                ? data_form.shipping_method
                : data_form.shipping_street,
            street_2:
              data_form.shipping_method &&
              ['retiro', 'tienda', 'punto', 'ultimate'].some(keyword =>
                data_form.shipping_method.toLowerCase().includes(keyword)
              )
                ? data_form.shipping_street
                : `${data_form?.wms_streetName || ''} | ${data_form?.wms_streetNumber || ''} | ${
                    data_form?.wms_departmentNumber || ''
                  }`,
            state: data_form.shipping_region,
            city: data_form.shipping_commune,
            zip: data_form.shipping_zip,
            company: Env.get('NAME_EMAIL'),
            country: Env.get('COUNTRY'),
            country_iso2: Env.get('COUNTRY_CODE'),
            email: data_form.shipping_email,
            shipping_method: data_form.shipping_method
          }
        ],
        base_shipping_cost: parseInt(data_form.shipping_cost),
        shipping_cost_inc_tax: parseInt(data_form.shipping_cost),
        shipping_cost_ex_tax: parseInt(data_form.shipping_cost),
        payment_method: data_form.payment_method,
        staff_notes: data_form.customer_message,
        discount_amount: data_form?.discount_amount || 0,
        ip_address: data_form?.ip_address,
        ip_address_v6: data_form?.cart_id,
        external_order_id: data_form.staff_notes,
        channel_id: parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID')),
        products
      }
    }
    ProductService.modifyStock(data_form.products)
    const postRequest = await axios
      .request(options)
      .then(function (response) {
        BigcommerceService.setMetafieldByOrder(
          response.data,
          data_form.staff_notes,
          'ct_document_type_bsale',
          'document_type_bsale'
        )
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        console.log('Error al crear la orden', error)
        return { status: error.status, message: error.response.data }
      })
    if (COUNTRY.COL == Env.get('LOCATION')) {
      const saveDocumentType = await BigcommerceService.setMetafieldByOrder(
        { id: postRequest.message.id /* numero de orden */ },
        data_form.documentType,
        'ct_identification',
        'identification_type'
      )
      console.log('Saved', saveDocumentType)
      if (data_form.payment_method.toLowerCase().includes('contraentrega')) {
        PaymentColombiaService.pagoContraEntrega(postRequest.message.id, this)
      }
    }

    // Verificar si la transacción es sospechosa de manera asíncrona
    if (postRequest?.message?.id) {
      setImmediate(async () => {
        try {
          await MailchimpService.addContact(postRequest.message.id)
          await MailchimpService.addContact(postRequest.message.id, Env.get('MAILCHIMP_AUDIENCIA'))
          await GeneralService.verifyFraudulentTransaction(postRequest.message)
          console.log('creación de orden verificada exitosamente.')
        } catch (error) {
          console.error('Error al verificar los datos de la compra:', error)
        }
      })
    }

    return postRequest
  }

  private async discountInventoryPacks(products) {
    const result = await Promise.all(
      products.map(async product => {
        const { packs, ...restProduct } = product
        if (packs?.length > 0) {
          await Promise.all(
            packs.map(
              async element =>
                await BigcommerceService.updateProduct({
                  id: element.id,
                  stock: element.stock - product.quantity * element.quantity
                })
            )
          )
        }
        return restProduct
      })
    )

    return result
  }
  public async show({ params }: any) {
    try {
      // datos de la orden por ID
      let getOrderById = await BigcommerceService.getOrderById(params.order_id)

      if (params.shipping) {
        //  la dirección de envío
        const getShipping = await BigcommerceService.getShippingAddress(params.order_id)

        // productos por orden
        const getProductByOrder = await BigcommerceService.getProductsByOrder(params.order_id)

        //  mapa de SKU a cantidad
        const skuQuantityMap = getProductByOrder.reduce((acc, item) => {
          acc[item.sku.trim()] = item.quantity // Asumiendo que `quantity` es la propiedad que contiene la cantidad
          return acc
        }, {} as Record<string, number>) // Mapa de SKU a cantidad

        //  productos por SKU
        const productsOrderBySKU = await Promise.all(
          getProductByOrder.map(async item => {
            const sku = item.sku.trim()
            const product = await Variant.findBy('sku', sku)
            return product || null // Cambiar a null para filtrar más tarde
          })
        )

        // productos comprados
        const validProducts = productsOrderBySKU.filter(product => product !== null) as Variant[]

        // productos principales
        const productRoyal = await Promise.all(
          validProducts.map(async product => {
            const productId = product.product_id // Asegúrate de que `product_id` esté disponible
            return await ProductsBigcommerce.findBy('product_id', productId)
          })
        )

        // Formatear productos con sus variantes
        const formatProducts = await ProductService.formatProducts(productRoyal)

        // Filtrar variants en formatProducts que fueron comprados y asignarle la cantidad comprada
        formatProducts.forEach(product => {
          if (product.variants) {
            product.variants = product.variants.filter(variant => {
              const quantity = skuQuantityMap[variant.sku]
              if (quantity) {
                variant.quantity = quantity // Asignar la cantidad comprada
                return true
              }
              return false
            })
          }
        })

        return {
          order: getOrderById,
          shipping: { ...getShipping[0] },
          products: formatProducts
        }
      }

      return getOrderById
    } catch (error) {
      console.error('Error al obtener la información de la orden:', error)
      return {
        status: 'error',
        message: 'No se pudo obtener la información de la orden.',
        error: error.message || 'Error desconocido'
      }
    }
  }

  public async get_orders_by_customers({ params }: HttpContextContract) {
    let getOrdersByCustomer = await BigcommerceService.getOrdersByCustomer(params.id)

    return getOrdersByCustomer
  }

  public async edit({}: HttpContextContract) {}

  public async update({ params }: any) {
    const order_id = params.order_id
    const status = params.status
    const token = params?.token || undefined
    const code = params.authorizationCode
    let final_status = status == Env.get('VERIFY_CODE_STATUS_PAYMENT') && code == 0 ? 11 : 6
    let payment_method = params.payment_method ? params.payment_method : undefined
    if (payment_method) {
      payment_method =
        payment_method == Env.get('CODE_PAYMENT_METHOD_DEBITO')
          ? 'Debito ' + Env.get('PAYMENT_METHOD')
          : 'Credito ' + Env.get('PAYMENT_METHOD')
    }
    if (final_status == 11) {
      const order = await BigcommerceService.getOrderById(order_id)
      if (order.ip_address) {
        const roullete = await RoulleteCoupon.query().where('code', order.ip_address).first()
        const coupon = await Coupon.query().where('code', order.ip_address).first()
        if (coupon) {
          coupon.num_uses += 1
          await coupon.save()
          let [coupon_bigcommerce] = await BigcommerceService.getCoupons(order.ip_address)
          if (coupon_bigcommerce.type == 'free_shipping') {
            try {
              await Lottery.create({
                code: coupon_bigcommerce.code,
                order: order_id
              })
            } catch (error) {
              console.log('Error al guardar orden de sorteo', order_id)
            }
          }
        }
        if (roullete) {
          roullete.order = order_id
          await roullete.save()
        }
      }
      if (order.ip_address_v6) {
        await BigcommerceService.deleteCart(order.ip_address_v6)
      }
    }

    const options = {
      method: 'PUT',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders/' + order_id,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        status_id: final_status,
        customer_message: token,
        payment_method: payment_method
      }
    }

    const postRequest = await axios
      .request(options)
      .then(async function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })

    return postRequest
  }

  public async update_order(orderId, status, payment_method = '', token = '') {
    try {
      const options = {
        method: 'PUT',
        url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders/' + orderId,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
        },
        data: {
          status_id: status,
          payment_method: payment_method,
          customer_message: token
        }
      }
      if (status == 11) {
        const order = await BigcommerceService.getOrderById(orderId)
        if (order.ip_address) {
          const coupon = await Coupon.query().where('code', order.ip_address).first()
          if (coupon) {
            coupon.num_uses += 1
            await coupon.save()
            let [coupon_bigcommerce] = await BigcommerceService.getCoupons(order.ip_address)
            if (coupon_bigcommerce.type == 'free_shipping') {
              try {
                await Lottery.create({
                  code: coupon_bigcommerce.code,
                  order: orderId
                })
              } catch (error) {
                console.log('Error al guardar orden de sorteo', orderId)
              }
            }
          }
        }
      }
      const response = await axios.request(options)

      console.log(response.data)
      return { status: 200, message: response.data }
    } catch (error) {
      return { status: error.response.status || 500, message: error.response.data }
    }
  }

  public async updateStatusOrder({ request }: HttpContextContract) {
    const { status, order_id, payment_method, token } = request.body()
    const options = {
      method: 'PUT',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders/' + order_id,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        status_id: status,
        payment_method: payment_method,
        customer_message: token
      }
    }

    const postRequest = await axios
      .request(options)
      .then(async function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })

    return postRequest
  }

  public async coupon({ request }: HttpContextContract) {
    let { code } = request.body()
    let coupons = await BigcommerceService.getCoupons(code)
    if (coupons.length) {
      const { id, name, code } = coupons[0]
      const couponDB = await Coupon.query().where('code', code)
      if (!couponDB.length) {
        const coupon = await Coupon.create({
          id_coupon: id,
          name: name,
          code: code,
          num_uses: 0
        })
        coupons.num_uses = coupon.num_uses
        return coupons
      }
      coupons[0].num_uses = couponDB[0].num_uses
      return coupons
    }
    return coupons
  }

  public async get_downloads_by_customer({ params }: HttpContextContract) {
    const getOrdersByCustomer = await BigcommerceService.getOrdersByCustomer(params.user)
    const productsByOrder = await Promise.all(
      getOrdersByCustomer.map(order => BigcommerceService.getProductsByOrder(order.order))
    )
    const productsMap = productsByOrder
      .flat()
      .map(product =>
        !product.name.includes('Servicio de armado') ? { id: product.product_id, title: product.name } : null
      )
      .filter(product => product !== null)

    const productsUnique = productsMap.filter(
      (elem: any, index, self) => index === self.findIndex((t: any) => t.id === elem.id)
    )

    const downloadsByProducts = await Promise.all(
      productsUnique.map(async (product: any) => ({
        ...product,
        download: await BigcommerceService.getMetafieldsByProduct(product.id, 'product_downloads')
      }))
    )
    const productsWithDownloads = downloadsByProducts
      .map(product => ({
        ...product,
        download: product.download.length > 0 ? JSON.parse(product.download) : []
      }))
      .filter(item => item.download.length > 0)

    const result = productsWithDownloads.flatMap(product => {
      return product.download.map(download => {
        return { ...download, title: product.title }
      })
    })

    return result
  }

  public async ready_for_retirement({ params, request, response }: HttpContextContract) {
    const estados: Estado = {
      1: {
        message: 'Tu Producto se encuentra listo para retiro.',
        color: '#F54100',
        status: 'Listo para retiro'
      },
      2: {
        message: 'Oh! Lo sentimos no tenemos stock de este producto, pronto nos pondremos en contacto contigo.',
        color: '#262525',
        status: 'Producto sin stock'
      },
      3: {
        message:
          'Recuerda que este producto es una reserva y tardará dos semanas en llegar aproximadamente desde tu fecha de compra.',
        color: '#262525',
        status: 'Producto con reserva'
      },
      4: {
        message: 'Gracias por comprar con nostros, tu producto fué entregado.',
        color: '#A6A6A6',
        status: 'Entregado a cliente'
      },
      5: {
        message: 'Te informamos que tu producto esta siendo preparado por el centro de distribución.',
        color: '#262525',
        status: 'Preparación en Bodega'
      }
    }
    const { id, complete } = params
    const body = request.body()

    const products: any = await BigcommerceService.getProductsRedyForRetirment(id)
    interface Estado {
      [id: number]: {
        message: string
        color: string
        status: string
      }
    }

    if (complete) {
      try {
        const orderBD = await StatusOrder.findBy('order', id)

        if (orderBD) {
          orderBD.delivered = true
          await orderBD.save()
        }
        BigcommerceService.setStatusOrder(id, 3)
        return response.ok({ message: 'Pedido completado y actualizado en BD' })
      } catch (error) {
        return response.abort({ error })
      }
    }

    const products_with_status = body.map(e => {
      const product = products.find(product => product.variants.some(variant => variant.sku == e.sku))
      if (product) {
        const { image_url } = product?.variants.find(variant => variant.sku == e.sku)
        return { name: product.name, image: image_url, status: estados[e.estado] }
      }
      return { name: 'no existe producto', image: '#', status: e.sku }
    })

    //envio de mail de pedidos completados
    const [shipping_order] = await BigcommerceService.getShippingAddress(id)
    const getPickupStores = await GeneralService.getPickupStores(
      Number(Env.get('BIGCOMMERCE_CHANNEL_ID')),
      'pickup_store'
    )
    const { billing_address } = await this.show({ params: { order_id: id } })
    const shipping = getPickupStores.filter(pickup => pickup.title === shipping_order.shipping_method)
    const order_id = await BigcommerceService.getOrderById(id)
    if (shipping.length > 0) {
      await StatusOrder.firstOrCreate({
        order: id,
        shipping: shipping_order.shipping_method,
        method: 'Retiro en tienda',
        delivered: false,
        created_at: order_id.date_created
      })
      await new CompleteOrder({
        ...shipping[0],
        id,
        email: shipping_order.email,
        name: `${billing_address.first_name} ${billing_address.last_name}`,
        products: products_with_status
      }).send()

      if (body.some(e => e.estado === 1)) {
        BigcommerceService.setStatusOrder(id, 10)
        return response.ok({ message: 'Email enviado y estado actualizado en BC' })
      }
      return response.ok({ message: 'Email enviado correctamente' })
    }

    return response.abort({ message: 'algo ha salido mal' })
  }
  // public async update_order_colombia({ params }: any) {
  //   const order_id = params.order_id
  //   const status = params.status
  //   const payment_method = params?.type_payment || ''

  //   const options = {
  //     method: 'PUT',
  //     url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v2/orders/' + order_id,
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Accept': 'application/json',
  //       'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
  //     },
  //     data: {
  //       status_id: status,
  //       payment_method: payment_method,
  //     },
  //   }

  //   const postRequest = await axios
  //     .request(options)
  //     .then(async function (response) {
  //       return { status: 200, message: response.data }
  //     })
  //     .catch(function (error) {
  //       return { status: error.response.status, message: error.response.data }
  //     })

  //   return postRequest
  // }
  public async fulppi_order_update({ params, response }: HttpContextContract) {
    try {
      const id = params.order_id
      const alegraService = new AlegraService()

      if (!id) {
        return response.abort({ msg: 'El id de la orden es requerido.' })
      }
      const orderInfo = await BigcommerceService.getOrderById(id)
      if (orderInfo.status_id == 11 || orderInfo.status_id == 10) {
        return
      }

      const processOrder = async (id_order: string) => {
        await this.update_order(id_order, 10, 'Pago contra entrega')
        const createInvoice = await alegraService.createDocs(Number(id_order))
        if (createInvoice?.status !== 200) {
          const orderInfo = await BigcommerceService.getOrderById(id_order)
          await AlertWarningService.postMailingWarningInvoice(orderInfo)
        }
      }

      if (id) {
        await processOrder(id)
        return response.ok({ msg: 'Orden actualizada correctamente' })
      }
    } catch (error) {
      console.error('Error en fulppi_order_update:', error)
      return response.badGateway({ error: 'Error al actualizar la orden. Intente nuevamente más tarde.' })
    }
  }
}
