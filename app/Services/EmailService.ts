import Env from '@ioc:Adonis/Core/Env'
import OrdersController from 'App/Controllers/Http/OrdersController'
import { COUNTRY } from 'App/Interfaces/Countries'
import ProcesOrder from 'App/Mailers/ProcesOrder'
import DeliverysCommune from 'App/Models/DeliverysCommune'
import DistrictsPeru from 'App/Models/DistrictsPeru'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
import Variant from 'App/Models/Variant'
import BigcommerceService from 'App/Services/BigcommerceService'
import DeliverysCommuneService from 'App/Services/DeliverysCommuneService'
import GeneralService from 'App/Services/GeneralService'
import moment from 'moment-timezone'
import 'moment/locale/es'
import PrismicService from './PrismicService'

moment.locale('es')

// 💰 Helper para formatear precios de forma consistente
function formatPrice(product: any, locale: string): string {
  if (product?.discount_price) {
    return product.discount_price.toLocaleString(locale)
  }
  if (product?.normal_price) {
    return product.normal_price.toLocaleString(locale)
  }
  if (product?.calculate_price) {
    return product.calculate_price.toLocaleString(locale)
  }
  return '0'
}

// 🎁 Helper para detectar gift cards
function isGiftCard(title: string): boolean {
  return title.toLowerCase().includes('card') || title.toLowerCase().includes('gift')
}

// 📝 Helper para normalizar staff_notes
function normalizeStaffNotes(staff_notes: string): string {
  return staff_notes?.toLowerCase() === 'boleta' || staff_notes?.toLowerCase() === 'factura' ? '' : staff_notes
}

// 📎 Helper para parsear downloads de forma robusta
function parseDownload(rawDownload: any): any {
  if (Array.isArray(rawDownload) || typeof rawDownload === 'object') {
    return rawDownload
  }
  if (typeof rawDownload === 'string' && rawDownload.trim()) {
    try {
      return JSON.parse(rawDownload)
    } catch {
      return ''
    }
  }
  return ''
}

// 🕒 Definir la zona horaria por país para asegurar horas locales correctas
const TZ_BY_COUNTRY: Record<string, string> = {
  CL: 'America/Santiago',
  CO: 'America/Bogota',
  PE: 'America/Lima'
}

function getCountryTz(countryCode: string): string {
  // ✅ Fallback seguro a UTC si no se reconoce el país
  return TZ_BY_COUNTRY[countryCode] || 'UTC'
}

// 📅 Lista base de feriados por país (extensible a futuro)
const HOLIDAYS_BY_COUNTRY: Record<string, string[]> = {
  CL: ['01-01', '01-05', '18-09', '19-09', '08-12', '25-12', '23-12', '24-12', '30-12', '31-12'],
  CO: ['01-01', '20-07', '07-08', '08-12', '25-12', '23-12', '24-12', '30-12', '31-12'],
  PE: ['01-01', '28-07', '29-07', '08-12', '25-12', '23-12', '24-12', '30-12', '31-12']
}

function isHoliday(date: moment.Moment, countryCode: string): boolean {
  const list = HOLIDAYS_BY_COUNTRY[countryCode] || []
  const dayMonth = date.format('DD-MM')
  return list.includes(dayMonth)
}

// 🔁 Ajuste iterativo de fechas para saltar domingos y feriados locales
function adjustForHolidaysIterative(date: moment.Moment, countryCode: string): moment.Moment {
  const tz = getCountryTz(countryCode)
  let d = date.clone().tz(tz)
  // 🔄 Evito condición constante con un límite razonable de iteraciones
  for (let i = 0; i < 31; i++) {
    const sunday = d.day() === 0
    const holiday = isHoliday(d, countryCode)
    if (!sunday && !holiday) return d
    d.add(1, 'day')
  }
  return d
}

export default class EmailService {
  public static async payloadEmail(order_id, bsale_token: any = undefined) {
    try {
      const {
        id,
        subtotal_inc_tax,
        total_inc_tax,
        coupon_discount,
        payment_method,
        date_created,
        billing_address,
        staff_notes,
        ip_address: coupon_name = '',
        discount_amount,
        customer_message,
        external_order_id
      } = await BigcommerceService.getOrderById(order_id)
      const shippingAddress = await BigcommerceService.getShippingAddress(order_id)
      const shipping_order = shippingAddress ? shippingAddress[0] : false // se declara false cuando es giftcard
      const products_order = await BigcommerceService.getProductsByOrder(order_id)
      // 🧭 Obtener el país y formatear el RUT solo si es Chile
      const countryCode = Env.get('COUNTRY_CODE') || 'CL'
      const rut =
        countryCode === 'CL' && typeof billing_address.zip === 'string' && billing_address.zip.length > 1
          ? this.formatRut(billing_address.zip)
          : billing_address.zip || ''
      const products_formated = await this.formatProducts(products_order)
      const hasReserve = await this.hasReservedProducts(products_formated) // valida is hay productos con reserva
      console.log(hasReserve)
      const date = this.formatDate(date_created)
      const is_retiro =
        shipping_order &&
        (shipping_order.shipping_method.toLowerCase().includes('retiro') ||
          shipping_order.shipping_method.toLowerCase().includes('tienda') ||
          shipping_order.shipping_method.toLowerCase().includes('punto'))
      const value = external_order_id

      // para los casos de compras de gift card
      billing_address.street_1 = billing_address.street_1.includes('undefined')
        ? 'No aplica para compras de producto digital'
        : billing_address.street_1

      const order = {
        nro_pedido: id,
        subtotal: parseInt(subtotal_inc_tax).toLocaleString(Env.get('LOCALE_STRING')),
        total: parseInt(total_inc_tax).toLocaleString(Env.get('LOCALE_STRING')),
        coupon_discount: parseInt(coupon_discount).toLocaleString(Env.get('LOCALE_STRING')),
        payment_method,
        date,
        billing:
          Env.get('COUNTRY_CODE') === 'CL'
            ? `${Env.get('URL_VIEW_BSALE')}/${bsale_token}`
            : Env.get('COUNTRY_CODE') === 'PE'
            ? customer_message
            : '',
        tracking: `https://api.enviame.io/s2/companies/${Env.get('CODE_ENVIAME')}/deliveries/${id}/tracking`,
        billing_address,
        document_type: value,
        staff_notes: normalizeStaffNotes(staff_notes),
        coupon_name,
        discount_amount: Number(discount_amount).toLocaleString(Env.get('LOCALE_STRING')),
        external_order_id,
        someReserve: hasReserve.someReserved, //alguno productos de la orden en reserva "true"
        allReserve: hasReserve.allReserved, // todos los productos estan en reserva "true"
        typeDelivery: shipping_order ? shipping_order.shipping_method : 'gift_card'
      }
      const client = {
        name: billing_address.first_name + ' ' + billing_address.last_name,
        phone: billing_address.phone,
        email: billing_address.email,
        rut
      }
      let shipping = {
        street_1: shipping_order ? shipping_order.street_1 : '',
        cost: shipping_order ? parseInt(shipping_order.cost_inc_tax).toLocaleString(Env.get('LOCALE_STRING')) : '',
        street_2: shipping_order ? shipping_order.street_2 : '',
        city: shipping_order ? shipping_order.city : '',
        country: shipping_order ? shipping_order.country : '',
        method: shipping_order ? shipping_order.shipping_method : '',
        state: shipping_order ? shipping_order.state : '',
        days_shipping: 0,
        delivery: ''
      }
      console.log('products', shipping)
      let products = products_formated.map(product => ({
        title: product.title,
        sku: product.sku,
        price: formatPrice(product, Env.get('LOCALE_STRING')),
        image: product.image || product?.image_url || '',
        quantity: product.quantity_final,
        download: parseDownload(product.download),
        armed_service: product.armed_service || '',
        reserve: product?.reserve?.length > 0 ? product.reserve : ''
      }))
      console.log('products', products, 'products_formated', products_formated)
      if ((shipping_order && shipping.method === 'Envío Estándar') || shipping.method === 'Envío Gratis') {
        const dataShipping = await this.dataShippingByMethod(products, shipping, date_created, 'standard')
        products = dataShipping.products
        shipping = dataShipping.shipping
      }
      if (shipping_order && shipping.method === 'Envío Express') {
        const dataShipping = await this.dataShippingByMethod(products, shipping, date_created, 'express')
        products = dataShipping.products
        shipping = dataShipping.shipping
      }
      if (is_retiro) {
        const dataWhithRetiro = await this.dataWithRetiro(products, shipping, shipping_order)
        console.log(dataWhithRetiro)
        products = dataWhithRetiro.products
        shipping = dataWhithRetiro.shipping
        const store = dataWhithRetiro.store
        return { is_retiro, store, order, client, shipping, products }
      }

      // Si la compra consiste en una sola giftcard se agrega la siguiente validación
      if (!shipping_order) {
        const giftCardMessage = '¡Pronto recibirás un correo con el código de tu gift card!'
        shipping.delivery = giftCardMessage
      }

      return { is_retiro, order, client, shipping, products }
    } catch (error) {
      console.error('Error en la preparación del correo', error)
      return error.message
    }
  }

  // 🚚 Método unificado para calcular envíos estándar y express
  private static async dataShippingByMethod(
    products: any[],
    shipping: any,
    date_created: string,
    method: 'standard' | 'express'
  ) {
    const countryCode = Env.get('COUNTRY_CODE') || 'CL'
    shipping.days_shipping = await this.shipping_days(countryCode, shipping)

    const isExpress = method === 'express'
    const daysForProduct = isExpress ? 0 : Number(shipping.days_shipping)

    shipping.delivery = await this.calculateShippingDelivery(
      shipping.days_shipping,
      false,
      date_created,
      isExpress,
      false,
      null,
      countryCode
    )

    products = products.map(product => {
      const isProductReserve = product.reserve !== ''
      const dateReserve = isProductReserve ? product.reserve : null
      const productDays = product.reserve === '' || product.reserve === 'NaN' ? daysForProduct : Number(product.reserve)

      const dispatch = this.calculateShippingDelivery(
        productDays,
        false,
        date_created,
        isExpress,
        isProductReserve,
        dateReserve,
        countryCode
      )

      const giftCardMessage = '¡Pronto recibirás un correo con el código de tu gift card!'
      const delivery = isGiftCard(product.title) ? giftCardMessage : dispatch

      return { ...product, delivery }
    })

    return { products, shipping }
  }

  public static async dataWithRetiro(products, shipping, shipping_order) {
    const getstores = await PrismicService.getStores()
    const method = shipping_order.shipping_method?.toLowerCase()
    console.log('🔍 Buscando tienda para método:', method)

    // 🔍 Buscar primero por title, luego por name
    let store = getstores.find(store => {
      const storeTitle = store.title?.toLowerCase()
      return method === storeTitle
    })

    if (store) {
      console.log(`✅ Tienda encontrada por title: ${store.title}`)
    } else {
      // Segunda búsqueda: por name
      store = getstores.find(store => {
        const storeName = store.name?.toLowerCase()
        return method === storeName
      })

      if (store) {
        console.log(`✅ Tienda encontrada por name: ${store.name}`)
      }
    }
    console.log('retiro :', store)

    // 🔍 Validar que se encontró la tienda
    if (!store) {
      console.error('❌ No se encontró la tienda para el método de envío:', shipping_order.shipping_method)
      console.log(
        '📋 Tiendas disponibles:',
        getstores.map(s => ({ title: s.title, name: s.name }))
      )

      // 🚨 Intentar búsqueda más flexible como fallback
      console.log('🔄 Intentando búsqueda flexible...')
      const flexibleStore = getstores.find(store => {
        const storeTitle = store.title?.toLowerCase()
        const storeName = store.name?.toLowerCase()

        return (
          (storeTitle && method.includes(storeTitle)) ||
          (storeName && method.includes(storeName)) ||
          (storeTitle && storeTitle.includes(method)) ||
          (storeName && storeName.includes(method))
        )
      })

      if (flexibleStore) {
        console.log(`✅ Tienda encontrada con búsqueda flexible: ${flexibleStore.title || flexibleStore.name}`)
        store = flexibleStore // Usar la tienda encontrada con búsqueda flexible
      } else {
        throw new Error(`No se encontró la tienda para el método de envío: ${shipping_order.shipping_method}`)
      }
    }

    // 🛍️ Remover cálculo innecesario de days_shipping para retiro
    shipping.delivery = `Te avisaremos por correo cuando tus productos estén listos para retirar. ¡Así nos aseguramos de entregártelos justo a tiempo! en ${shipping.method
      .toLowerCase()
      .replace('retiro', '')
      .trim()}.`
    // agrego el campo delivery al array de products , este contiene el tiempo de entrega
    products = products.map(product => {
      const days = product.reserve === '' ? store.days : Number(store.days) + Number(product.reserve)
      const isProductReserve = product.reserve !== ''
      const dateReserve = isProductReserve ? product.reserve : null
      const delivery = this.calculateShippingDelivery(
        days,
        true,
        new Date(),
        false,
        isProductReserve,
        dateReserve,
        Env.get('COUNTRY_CODE') || 'CL'
      )

      return { ...product, delivery }
    })

    return { products, shipping, store }
  }

  private static async formatProducts(products) {
    const productsList = await Promise.all(
      products.map(async product => {
        let isContraEntrega = product.name.toLowerCase().includes('contraentrega')
        if (isContraEntrega) {
          return null
        }

        let armed_service: any = {}
        let isService = product.name.toLowerCase().includes('servicio')
        if (isService) {
          const product_name = product.name.replace('Servicio de armado ', '')
          const aux_product = products.find(p => p.name === product_name)
          if (aux_product) {
            armed_service[aux_product.product_id] = {
              name: '',
              price: parseInt(product.price_inc_tax).toLocaleString(Env.get('LOCALE_STRING')),
              quantity: product.quantity
            }
          }
        }
        armed_service = Object.keys(armed_service).length > 0 ? armed_service : false
        try {
          const productInfo = await this.getInfoProduct(product.sku)
          if (!productInfo.sku) {
            return null
          }
          const productFormat = { ...productInfo, armed_service, quantity_final: product.quantity }
          return productFormat
        } catch (error) {
          console.error(`Error al obtener información del producto con SKU ${product.sku}:`, error)
          return null
        }
      })
    )

    return productsList.filter(product => product !== null)
  }
  private static formatRut(rut: string) {
    let identification = rut.slice(0, -1)
    let digit = rut.slice(-1)

    let format_identification = `${identification.slice(0, 2)}.${identification.slice(2, 5)}.${identification.slice(5)}`

    let format_rut = `${format_identification}-${digit}`

    return format_rut
  }

  private static formatDate(date: string) {
    const buy_date = new Date(date)
    const dia = buy_date.getDate().toString().padStart(2, '0')
    const mes = (buy_date.getMonth() + 1).toString().padStart(2, '0')
    const anio = buy_date.getFullYear()
    const format_date = `${dia}/${mes}/${anio}`
    return format_date
  }

  public static async generate_email(order_id) {
    const OrdersControllerInstance = new OrdersController()
    const order = await OrdersControllerInstance.show({ params: { order_id } })
    const body_email = await EmailService.payloadEmail(order_id, order.customer_message)
    return await new ProcesOrder(body_email).send()
  }
  public static calculateShippingDelivery(
    daysShipping: number,
    isRetiro = false,
    startDate: Date | string = new Date(),
    express: boolean,
    isReserve = false,
    dateReserve: string | null = null,
    countryCodeParam?: string
  ) {
    const countryCode = countryCodeParam || (Env.get('COUNTRY_CODE') as string) || 'CL'
    const tz = getCountryTz(countryCode)
    const currentLocal = moment.tz(startDate, tz)

    // 🗓️ Priorizar mensajes de reserva
    if (isRetiro && isReserve) {
      return `Este producto fue comprado en reserva y estará disponible en el país a partir del ${dateReserve}. Espera el correo de confirmación de retiro, así aseguramos de entregártelos justo a tiempo, en la tienda seleccionada para brindarte una mejor experiencia.`
    }
    if (!isRetiro && isReserve) {
      return `Este producto fue comprado en reserva y estará disponible en el país a partir del ${dateReserve}. Podrá ser entregado en días hábiles, a partir de la fecha indicada.`
    }

    // 🛍️ Retiro sin reserva
    if (isRetiro) {
      return 'Te avisaremos por correo cuando tus productos estén listos para retirar. ¡Así nos aseguramos de entregártelos justo a tiempo!'
    }

    // 🚀 Express: corte 12 pm local usando la fecha de creación del pedido
    if (express === true) {
      const createdLocal = currentLocal.clone()
      let deliveryDate = createdLocal.hour() < 12 ? createdLocal.clone() : createdLocal.clone().add(1, 'day')
      // domingo → lunes
      if (deliveryDate.day() === 0) deliveryDate.add(1, 'day')
      // feriados iterativos
      deliveryDate = adjustForHolidaysIterative(deliveryDate, countryCode)

      const deliveryLabel = createdLocal.hour() < 12 ? 'hoy' : 'mañana'
      const cutoffTime = '12:00 PM'
      return `🚀 ¡Envío Express confirmado! Tu pedido será entregado ${deliveryLabel} ${deliveryDate.format(
        'dddd D [de] MMMM'
      )}. Las compras realizadas antes de las ${cutoffTime} se entregan el mismo día, después de esa hora al día siguiente. ¡Disfruta de la velocidad de nuestro servicio Express!`
    }

    // 📦 Estándar: sumar días hábiles (sin domingos) + ajustar feriados
    const resultDate = currentLocal.clone()
    let remainingDays = Number(daysShipping) || 0

    while (remainingDays > 0) {
      resultDate.add(1, 'day')
      if (resultDate.day() !== 0) {
        remainingDays--
      }
    }

    const adjustedStart = adjustForHolidaysIterative(resultDate.clone(), countryCode)
    let endDate = adjustedStart.clone().add(1, 'day')
    endDate = adjustForHolidaysIterative(endDate, countryCode)

    return `Recibirás tu pedido aproximadamente entre el día ${adjustedStart.format(
      'dddd D [de] MMMM'
    )} y ${endDate.format('D [de] MMMM')}`
  }

  // ❗️ DEPRECATED: Esta función ya no se usa en el flujo actual
  // Se mantiene solo como referencia histórica
  public static adjustForHolidays(date) {
    // console.log(date)
    const dayMonth = date.format('DD-MM')

    //  console.log(dayMonth)

    if (dayMonth === '23-12' || dayMonth === '30-12') {
      return date.add(3, 'days') // Sumar 3 días
    }
    if (dayMonth === '24-12') {
      return date.add(2, 'days') // Sumar 3 días
    }
    if (dayMonth === '31-12') {
      return date.add(2, 'days') // Sumar 3 días
    } else if (dayMonth === '01-01' || dayMonth === '25-12') {
      return date.add(1, 'days') // Cambiar a 02-01
    }
    return date
  }
  // ❗️ DEPRECATED: Esta función no se usa en el flujo actual
  // Se mantiene solo como referencia histórica
  public static addDays(dateString: string, preparation = 5): number {
    const meses: { [key: string]: number } = {
      enero: 0,
      febrero: 1,
      marzo: 2,
      abril: 3,
      mayo: 4,
      junio: 5,
      julio: 6,
      agosto: 7,
      septiembre: 8,
      octubre: 9,
      noviembre: 10,
      diciembre: 11
    }

    // Dividir el string para obtener el día y el mes
    const partes = dateString?.toLowerCase()?.split(' ')
    const dia = parseInt(partes[0], 10)
    const mesNombre = partes[2] || partes[1] // En caso de que el formato sea "22 de enero"

    if (isNaN(dia) || !meses.hasOwnProperty(mesNombre)) {
      console.error('Fecha no válida:', dateString)
      return NaN
    }

    // Obtener el año actual
    const year = new Date().getFullYear()

    // Crear una instancia de Date con la fecha objetivo
    let targetDate = new Date(year, meses[mesNombre], dia)

    // Si la fecha ya pasó este año, sumamos un año
    if (targetDate < new Date()) {
      targetDate = new Date(year + 1, meses[mesNombre], dia)
    }

    // Calcular la diferencia en milisegundos
    const today = new Date()
    let diffInMillis = targetDate.getTime() - today.getTime()

    // Convertir la diferencia a días
    let diffInDays = Math.floor(diffInMillis / (1000 * 3600 * 24))

    // Si el resultado es negativo (es decir, la fecha es antes que la actual)
    if (diffInDays < 0) {
      console.error('La fecha objetivo ya ha pasado.')
      return preparation
    }

    // Contar los días de preparación, ignorando los domingos
    let businessDays = 0
    let totalDays = diffInDays
    let daysAdded = 0

    // Sumar los días de preparación
    while (businessDays < preparation) {
      daysAdded++
      const currentDate = new Date(today.getTime() + (totalDays + daysAdded) * 24 * 60 * 60 * 1000) // Sumar un día
      const diaSemana = currentDate.getDay() // 0 es domingo, 1 es lunes, etc.

      // Si no es domingo (0 es domingo)
      if (diaSemana !== 0) {
        businessDays++
      }
    }

    // El resultado final es la cantidad de días entre la fecha actual y la fecha objetivo más los días de preparación
    return diffInDays + preparation + (businessDays - preparation)
  }
  public static async hasReservedProducts(productsOrder) {
    console.log(productsOrder)
    const allReserved = productsOrder.every(elem => elem.reserve !== '')
    const someReserved = productsOrder.some(elem => elem.reserve !== '')

    return {
      allReserved, // true si todos están reservados
      someReserved // true si al menos uno está reservado
    }
  }

  // ❗️ DEPRECATED: payloadEmail_CO ya no se usa en el flujo actual
  // Se mantiene solo como referencia histórica
  // public static async payloadEmail_CO(order_id) {
  // ... código comentado para referencia histórica ...
  //   return { is_retiro: false, order: {}, client: {}, shipping: {}, products: [] }
  // }

  public static async shipping_days(location: string, shipping): Promise<number> {
    if (location === COUNTRY.CL) {
      const key = shipping.city.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const data: DeliverysCommune[] = await DeliverysCommuneService.getCommuneDeliveryByName(key)
      const { lead_time = 2, delivery_time = 2, extra_days = 1 } = data[0] || {}
      return lead_time + delivery_time + extra_days
    }

    if (location === COUNTRY.PE) {
      try {
        const [province, district] = shipping.city.split(' - ')
        const city = await DistrictsPeru.query()
          .whereHas('province', query => {
            query.where('provinces_peru.name', province.toUpperCase())
          })
          .where('name', district.toUpperCase())
          .preload('province', query => {
            query.preload('department')
          })
          .first()

        if (city !== null) {
          const ubigeo = city.ubigeo
          console.log('ubigeo', ubigeo)
          const data = await DeliverysCommuneService.getCommuneDeliveryById(ubigeo)
          if (!data) {
            console.warn(`No se encontró información de entrega para el ubigeo: ${ubigeo}`)
            return 5
          }
          const { lead_time = 2, delivery_time = 2, extra_days = 1 } = data || {}
          return lead_time + delivery_time + extra_days
        }
      } catch (error) {
        console.error('Error al obtener datos de envíos: ', error)
        return 5
      }
    }
    return 4
  }

  private static async getInfoProduct(sku: string) {
    try {
      // Buscar la variante por SKU
      const variant = await Variant.findBy('sku', sku)
      if (!variant) {
        throw new Error(`No se encontró la variante con SKU: ${sku}`)
      }

      // Obtener el producto asociado a la variante
      const product = await ProductsBigcommerce.findBy('product_id', variant.product_id)

      if (!product) {
        throw new Error(`No se encontró el producto por Id: ${variant.product_id}`)
      }
      const download = await BigcommerceService.getMetafieldsByProduct(product.product_id, 'product_downloads')

      // Seleccionar el campo 'reserve' del producto
      product.toJSON()

      return {
        ...variant.serialize(),
        reserve: product.reserve,
        download
      }
    } catch (error) {
      console.error('Error al obtener la información del producto:', error.message)
      return error
    }
  }
}
