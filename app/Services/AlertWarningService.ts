import { CustomAlert, ProductStockSecurity } from 'App/Interfaces/AlertsWarning'
import { Order } from 'App/Interfaces/OrderInterface'
import Env from '@ioc:Adonis/Core/Env'
import MailchimpService from 'App/Services/MailchimpService'
import StockSecurity from 'App/Models/StockSecurity'
import Variant from 'App/Models/Variant'
import CategoryProduct from 'App/Models/CategoryProduct'

export default class AlertWarningService {
  static readonly templates = {
    warningInvoice: 4,
    warningShipping: 5,
    warningStock: 6,
    outOfStock: 7
  }

  static readonly brandImage: string = Env.get('IMAGE_HEADER_EMAILS')!
  static readonly brand = `${Env.get('VARIABLE_BRAND')!} - ${Env.get('COUNTRY_CODE')!}`

  private static createEmailData(order: Order, message: string, templateNumber: number): CustomAlert {
    const { total_inc_tax, date_created } = order
    const { first_name, last_name, email } = order.billing_address
    const { id: id_order } = order

    return {
      order_id: id_order,
      brand: this.brand,
      date: date_created,
      customerName: `${first_name} ${last_name}`,
      email: email,
      brandImage: this.brandImage,
      total: total_inc_tax,
      message: message,
      templateNumber: templateNumber
    }
  }

  private static async sendEmail(dataEmail: CustomAlert) {
    try {
      return await MailchimpService.emailWarning(dataEmail)
    } catch (error) {
      console.error('Error sending email:', error)
      return { status: error.status || 500, message: error.message || 'Internal Server Error' }
    }
  }

  static async postMailingWarningInvoice(data: Order) {
    const message = `
    No se pudo generar la boleta/factura para el siguiente pedido. Te solicitamos que informes al área correspondiente a la brevedad para evitar problemas contables en la empresa y asegurar que el cliente cuente con la garantía de su pedido.

    A continuación, puedes revisar los detalles del pedido.
    `
    const dataEmail = this.createEmailData(data, message.trim(), this.templates.warningInvoice)
    return await this.sendEmail(dataEmail)
  }

  static async postMailingWarningShipping(data: Order) {
    const message = `
    Lamentablemente, no se pudo procesar este pedido en la plataforma de envío (WMS, URBANO, FULLPI). Te solicitamos que informes al área correspondiente a la brevedad para evitar retrasos en la entrega y asegurar que el cliente reciba su pedido a tiempo.

    A continuación, puedes revisar los detalles del pedido para más información.
    `
    const dataEmail = this.createEmailData(data, message.trim(), this.templates.warningShipping)
    return await this.sendEmail(dataEmail)
  }

  static async postMailingWarningStock(data: ProductStockSecurity[]) {
    const dataEmail: CustomAlert = {
      products: this.generateHtml(data),
      templateNumber: this.templates.warningStock,
      brandImage: this.brandImage,
      message: `Los siguiente productos han alcanzado su nivel de stock de seguridad.`
    }
    return await this.sendEmail(dataEmail)
  }

  static async postMailingProductOutStock(data: ProductStockSecurity[]) {
    const dataEmail: CustomAlert = {
      products: this.generateHtml(data),
      templateNumber: this.templates.outOfStock,
      brandImage: this.brandImage,
      message: `Los siguiente productos han alcanzado su límite de stock. Por favor, asegúrate que figuren como agotado en la web.`
    }
    return await this.sendEmail(dataEmail)
  }

  static async checkStockSecurityAlert() {
    try {
      // 1er Paso: Obtener todos los registros de la tabla product_stock_securities
      let stockRecords = await StockSecurity.all()
      if (stockRecords && stockRecords.length < 0) {
        return false
      }
      // 2do Paso: Extraer los SKUs de los registros
      const skus = stockRecords.map(record => record.sku)

      // 3er Paso: Buscar en la tabla Variants los  productos que pertenecen a stockRecords
      const products = await Variant.query()
        .whereIn('sku', skus)
        .select('sku', 'title', 'stock', 'image', 'product_id')
        .pojo()
      // console.log('Variantes encontradas:', variants)
      const variants = await this.excludeReservations(products as Partial<Variant[]>)

      // 4to Paso: Filtrar en variants, productos con stock 1
      const skuOutStock = variants.filter((variant: { stock: number; sku: string }) => {
        const stockRecord = stockRecords.find(record => record.sku === variant.sku)
        return variant.stock <= 1 && stockRecord && !stockRecord.email_sended // Fuera de stock y email no enviado
      })

      // 5to Paso: Filtrar en variants, productos con stock superior a 1 y menores o igual a su stock de seguridad definido en la tabla stock security
      const skuStockSecurity = variants.filter((variant: { stock: number; sku: string }) => {
        const stockRecord = stockRecords.find(record => record.sku === variant.sku)
        return (
          stockRecord && variant.stock > 1 && variant.stock <= stockRecord.stock_security && !stockRecord.email_sended
        ) // Stock de seguridad y email no enviado
      })
      //  console.log('Variantes con stock de seguridad:', skuStockSecurity)

      //6to Paso: Clasificar los productos con stock superior al stock de seguridad definido en la tabla stock security
      const skuAvailables = variants.filter((variant: { stock: number; sku: string }) => {
        const stockRecord = stockRecords.find(record => record.sku === variant.sku)
        return stockRecord && variant.stock > stockRecord.stock_security // Superior al stock de seguridad
      })
      // console.log('productos con stock superior a su stock de seguridad', skuAvailables)

      //7mo Paso: Actualizar en la tabla stock security los productos en skuAvailbles que representan los productos que superan su stock de seguridad. Se actualiza en la columna email_sended (email enviado)  en falso porque los productos cuentan con stock.

      const updateSkuAvailables = skuAvailables
        .filter(product => product !== null && product !== undefined)
        .map(product => product.sku.trim())
      await StockSecurity.query().whereIn('sku', updateSkuAvailables).update({ email_sended: false })

      //8vo Paso :  Actualizar email_sended en true para aquellos que productos cuyo stock están por debajo del stock de seguridad, dado que en el proximo paso se enviaran los emails

      const updateSkuLowStock = [...skuStockSecurity, ...skuOutStock]
        .filter(product => product !== null && product !== undefined)
        .map(product => product.sku.trim())
      await StockSecurity.query().whereIn('sku', updateSkuLowStock).update({ email_sended: true })

      //9no Paso: Enviar alertas con el formato para productos fuera de stock y actualizar esos productos en la tabla variant con stock 0
      let sendMailsOutStock
      if (skuOutStock.length > 0) {
        // console.log('Enviar alertas fuera de stock', skuOutStock)
        sendMailsOutStock = await this.handlerEmailsAlertsOutStock(skuOutStock as ProductStockSecurity[])
        const skusOutStock = skuOutStock
          .filter(product => product !== null && product !== undefined)
          .map(product => product.sku.trim())

        // Actualizar el stock a 0 para los productos fuera de stock
        await Variant.query().whereIn('sku', skusOutStock).update({ stock: 0 })
      }

      //10mo Paso: Enviar alertas con el formato  para productos con stock de seguridad
      let sendMailsStockSecurity
      if (skuStockSecurity.length > 0) {
        // console.log('Enviar alertas stock de seguridad', skuStockSecurity)

        sendMailsStockSecurity = await this.handlerEmailsAlertsStockSecurity(skuStockSecurity as ProductStockSecurity[])
      }

      console.log({
        status: 'Procesado',
        out_stock: skuOutStock.length,
        stock_security: skuStockSecurity.length,
        stock_available: skuAvailables.length
      })
      return {
        success: true,
        out_stock: sendMailsOutStock,
        stock_security: sendMailsStockSecurity,
        stock_available: skuAvailables.length
      }
    } catch (error) {
      console.error('Error al verificar alertas de stock de seguridad:', error.message)
      return false
    }
  }

  static async handlerEmailsAlertsOutStock(products: ProductStockSecurity[]) {
    try {
      //  console.log('data stock out', products)

      await this.postMailingProductOutStock(products)

      return products.length
    } catch (error) {
      console.error('Error inesperado en el envío de correos de fuera de stock:', error.message)
      return {
        success: false,
        error: error.message || 'Error desconocido'
      }
    }
  }
  static async handlerEmailsAlertsStockSecurity(products: ProductStockSecurity[]) {
    try {
      //console.log('Data stock security:', products)

      // Enviar alerta de stock con el listado de productos
      await this.postMailingWarningStock(products)

      return products.length
    } catch (error) {
      console.error('Error inesperado en el envío de correos de fuera de stock:', error.message)
      return {
        success: false,
        error: error.message || 'Error desconocido'
      }
    }
  }
  private static generateHtml(data: ProductStockSecurity[]): string {
    // Encabezados de la tabla
    const headers = `
      <tr style="background-color: #f2f2f2;">
        <th style="padding: 10px; text-align: left;">SKU</th>
        <th style="padding: 10px; text-align: left;">Título</th>
        <th style="padding: 10px; text-align: left;">Stock</th>
        <th style="padding: 10px; text-align: left;">Imagen</th>
      </tr>
    `

    // Filas de la tabla
    const rows = data
      .map(
        product => `
      <tr style="height: 50px; background-color: #ffffff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
        <td style="padding: 10px; font-size: 10px;">${product.sku}</td> <!-- SKU más pequeño -->
        <td style="padding: 10px;">${product.title}</td>
        <td style="padding: 10px;">${product.stock}</td>
        <td style="padding: 10px;">
          <img src="${product.image}" alt="${product.title}" style="max-height: 50px;"/>
        </td>
      </tr>
    `
      )
      .join('')

    // Retornar la tabla completa
    return `
      <div style="overflow-x: auto;">
        <table border="1" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; min-width: 300px;">
          <thead>
            ${headers}
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `
  }
  static async excludeReservations(products: Partial<Variant[]>) {
    try {
      // Verificar si products es undefined o no es un array
      if (!Array.isArray(products) || products.length === 0) {
        throw new Error('Debe enviar un array de productos')
      }

      // Paso 1: Obtener el ID de la categoría de reservas
      const ID_RESERVE = Number(Env.get('ID_RESERVE'))

      // Paso 2: Obtener los product_id que pertenecen a la categoría de reservas
      const categoryProducts = await CategoryProduct.query().where('category_id', ID_RESERVE).select('product_id')

      // Extraer solo los product_id en un array
      const productIdsInCategory = categoryProducts.map(item => item.product_id)

      // Paso 3: Filtrar los productos que no están en la categoría de reservas
      const filteredProducts = products.filter(
        (product): product is Variant =>
          product !== undefined &&
          product.product_id !== undefined &&
          !productIdsInCategory.includes(product.product_id)
      )

      // Paso 4: Devolver la misma estructura sin product_id
      return filteredProducts.map(({ product_id, ...rest }) => rest)
    } catch (error) {
      throw new Error('Hubo un error al filtrar los productos sin reservas')
    }
  }
}
