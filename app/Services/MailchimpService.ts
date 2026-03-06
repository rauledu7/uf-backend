import Env from '@ioc:Adonis/Core/Env'
import mailchimp from '@mailchimp/mailchimp_marketing'
import mailchimpTx from '@mailchimp/mailchimp_transactional'
import Member from 'App/Entities/Mailchimp/Member'
import { CustomAlert } from 'App/Interfaces/AlertsWarning'
import { SuscribeUser } from 'App/Interfaces/Mailchimp/NewMember'
import BigcommerceService from 'App/Services/BigcommerceService'
import { createHash } from 'crypto'
import moment from 'moment'

class MailchimpService {
  private static API_KEY = Env.get('API_KEY_MAILCHIMP')
  private static SERVER = Env.get('SERVER_MAILCHIMP')
  private static ID_LIST_MAILCHIMP = Env.get('ID_LIST_MAILCHIMP')
  private static configured = false

  //TODO: Metodo para configurar el uso de mailchimp API
  private static configure() {
    if (!this.configured) {
      mailchimp.setConfig({ apiKey: this.API_KEY, server: this.SERVER })
      this.configured = true
    }
  }
  //TODO: Metodo para dar el formato adecuado con los datos del cliente para enviar a Mailchimp
  private static async createContact(order: string | number): Promise<Member> {
    try {
      let dataOrder = await BigcommerceService.getOrderById(order)
      // console.log(dataOrder)
      const { id, status, total_inc_tax, ip_address, discount_amount } = dataOrder
      const { first_name, last_name, street_1, city, country, phone, email } = dataOrder.billing_address

      const contact: SuscribeUser = {
        firstName: first_name.charAt(0).toUpperCase() + first_name.slice(1).toLowerCase(),
        lastName: last_name.charAt(0).toUpperCase() + last_name.slice(1).toLowerCase(),
        email: email.toLowerCase(),
        city: city.toLowerCase(),
        address: street_1.toLowerCase(),
        phone: phone,
        date: moment().format('DD-MM-YYYY'),
        brand: Env.get('NAME_EMAIL'),
        coupon: !ip_address ? 'Ninguno' : ip_address,
        venta: status == 'Awaiting Fulfillment' ? 'Pagado' : 'Pendiente',
        value: parseInt(total_inc_tax.toLocaleString(Env.get('LOCALE_STRING'))),
        order: id,
        discount: parseInt(discount_amount).toLocaleString(Env.get('LOCALE_STRING')),
        country: country
      }
      const newContact = new Member(contact)
      return newContact
    } catch (error) {
      throw error
    }
  }

  //TODO: metodo para agregar o actualizar lista de contactos ya existentes
  static async addContact(order: number, audience_id = this.ID_LIST_MAILCHIMP): Promise<any> {
    try {
      this.configure()
      const member: Member = await this.createContact(order)
      // console.log(member)
      if (member) {
        const hashEmail = createHash('md5').update(member?.email.toLowerCase()).digest('hex')
        const response = await mailchimp.lists.setListMember(
          audience_id,
          hashEmail,
          { email_address: member.email, status: 'subscribed', skip_merge_validation: false },
          {
            merge_fields: {
              FNAME: member.firstName,
              LNAME: member.lastName,
              MERGE8: member.phone,
              FECHA: member.date,
              MARCA: member.brand,
              CUPON: member.coupon,
              DSCTOCUPON: member.discount,
              PAIS: member.country,
              MERGE10: member.city
            }
          }
        )

        if (response) {
          await this.addTag(member.email, Env.get('TAG_MAILCHIMP'))
        }
        return response
      }
    } catch (error) {
      return { status: 'error', code: error.code, message: error.message, stack: error.stack }
    }
  }

  static async addContactNewsletter(email: string, audience_id = this.ID_LIST_MAILCHIMP): Promise<any> {
    try {
      this.configure()
      const hashEmail = createHash('md5').update(email.toLowerCase()).digest('hex')
      const response = await mailchimp.lists.setListMember(audience_id, hashEmail, {
        merge_fields: {
          MARCA: Env.get('NAME_EMAIL'),
          PAIS: Env.get('COUNTRY'),
          NEWSLETTER: 'SI'
        }
      })
      if (response) {
        await this.addTag(email, Env.get('TAG_MAILCHIMP'))
      }

      return response
    } catch (error) {
      return { status: 'error', code: error.code, message: error.message, stack: error.stack }
    }
  }

  static async addTag(email: string, tag: string) {
    try {
      this.configure()
      const hashEmail = createHash('md5').update(email.toLowerCase()).digest('hex')
      const response = await mailchimp.lists.updateListMemberTags(this.ID_LIST_MAILCHIMP, hashEmail, {
        tags: [
          {
            name: tag,
            status: 'active'
          }
        ]
      })
      return response
    } catch (error) {
      return { status: 'error', code: error.code, message: error.message, stack: error.stack }
    }
  }
  static async sponsorReview(order_id: number | string) {
    try {
      if (!order_id) {
        throw new Error('Please enter all data for the review should be provided email and product_id')
      }

      this.configure()
      const {
        billing_address: { email }
      } = await BigcommerceService.getOrderById(order_id)
      const dataProductReview = await BigcommerceService.getProductsByOrder(order_id)
      const product = dataProductReview.sort((a, b) => b.price_ic_tax - a.price_ic_tax)[0]
      const { product_id } = product
      const getMoreDataProduct = await BigcommerceService.getProductSingle(product_id)
      const { image_url } = getMoreDataProduct.variants[0]
      const { url } = getMoreDataProduct.custom_url
      const productLinkWebsite = `${Env.get('URL_SITE')}/producto${url}?id=${product_id}&review=1`

      if (!dataProductReview) {
        throw new Error('product not found in bigcommerce service')
      }

      const hashEmail = createHash('md5').update(email.toLowerCase()).digest('hex')
      const response = await mailchimp.lists.setListMember(this.ID_LIST_MAILCHIMP, hashEmail, {
        merge_fields: {
          REVIEW: 'SI',
          MARCA: Env.get('NAME_EMAIL'),
          PAIS: Env.get('COUNTRY'),
          PRO_PREREV: productLinkWebsite,
          IMA_PREREV: image_url
        }
      })

      return response
    } catch (error) {
      return { status: 'error', code: error.code, message: error.message, stack: error.stack }
    }
  }

  static async createEmail() {
    try {
      const message = {
        from_email: Env.get('CONTACT_EMAIL'),
        subject: 'Hello world',
        text: 'Welcome to Mailchimp Transactional!',
        to: [
          {
            email: 'jesus.udiz@bettercommerce.cl',
            type: 'to'
          }
        ]
      }

      const response = await mailchimpTx(Env.get('SMTP_PASSWORD')).messages.send({
        message
      })
      return response
    } catch (error) {
      return { status: 'error', code: error.code, message: error.message, stack: error.stack }
    }
  }
  static async sendEmilTemplatGiftCard(dataTemplate) {
    try {
      const mailchimpClient = mailchimpTx(Env.get('SMTP_PASSWORD_MAILCHIMP'))
      const data = dataTemplate.data
      const message = data.message === '' ? '¿Que esperas para tener lo que necesitas para entrenar?' : data.message
      const run = async () => {
        const response = await mailchimpClient.messages.sendTemplate({
          template_name: this.selectTemplateName(data.amount), // metodo que determina el nombre de la plantilla del mailchimp
          template_content: [
            { name: 'FNAME', content: data.to_name },
            { name: 'QUIENREGALA', content: data.from_name },
            { name: 'MENSAJEGIFT', content: message },
            { name: 'CODIGOGIFTCARD', content: data.code },
            {
              name: 'MONTO',
              content: String(new Intl.NumberFormat(Env.get('LOCALE_STRING')).format(parseInt(data.amount)))
            }
          ],
          message: {
            subject: 'Felicidades acabas de recibir una Gift Card para compras en Ultimate',
            from_email: Env.get('CONTACT_EMAIL'),
            from_name: Env.get('MARCA'),
            to: [
              {
                email: data.to_email,
                type: 'to',
                name: data.to_name,
                important: true,
                track_opens: true,
                track_clicks: true
              },
              data.to_email !== data.from_email
                ? {
                    email: data.from_email,
                    type: 'cc',
                    name: data.from_name,
                    important: true,
                    track_opens: true,
                    track_clicks: true
                  }
                : null
            ],
            merge: true,
            merge_vars: [
              {
                rcpt: data.to_email,
                vars: [
                  { name: 'FNAME', content: data.to_name },
                  { name: 'QUIENREGALA', content: data.from_name },
                  { name: 'MENSAJEGIFT', content: message },
                  { name: 'CODIGOGIFTCARD', content: data.code },
                  {
                    name: 'MONTO',
                    content: String(new Intl.NumberFormat(Env.get('LOCALE_STRING')).format(parseInt(data.amount)))
                  }
                ]
              },
              {
                rcpt: data.from_email,
                vars: [
                  { name: 'FNAME', content: data.to_name },
                  { name: 'QUIENREGALA', content: data.from_name },
                  { name: 'MENSAJEGIFT', content: data.message },
                  { name: 'CODIGOGIFTCARD', content: data.code },
                  {
                    name: 'MONTO',
                    content: String(new Intl.NumberFormat(Env.get('LOCALE_STRING')).format(parseInt(data.amount)))
                  }
                ]
              }
            ]
          }
        })
        console.log(response)
        return response
      }
      return await run()
    } catch (error) {
      console.error(error)
      return { status: error.status, message: error.message }
    }
  }
  static async addContactSingle(email: string, name: string, audience_id = this.ID_LIST_MAILCHIMP): Promise<any> {
    try {
      this.configure()
      // console.log(member)
      const hashEmail = createHash('md5').update(email.toLowerCase()).digest('hex')
      const response = await mailchimp.lists.setListMember(
        audience_id,
        hashEmail,
        { email_address: email, status: 'subscribed', skip_merge_validation: false },
        {
          merge_fields: {
            FNAME: name
          }
        }
      )

      if (response) {
        await this.addTag(email, Env.get('TAG_MAILCHIMP'))
      }
      console.log(response)
      return response
    } catch (error) {
      return { status: 'error', code: error.code, message: error.message, stack: error.stack }
    }
  }
  static selectTemplateName(amount: string): string {
    const templates = {
      25: 'GIFT CARD MAIL 25.000',
      50: 'GIFT CARD 50.000',
      75: 'GIFT CARD MAIL 75.000',
      100: 'GIFT CARD MAIL 100.000',
      150: 'GIFT CARD MAIL 150.000'
    }
    if (parseInt(amount) === 25000) return templates[25]
    if (parseInt(amount) === 50000) return templates[50]
    if (parseInt(amount) === 75000) return templates[75]
    if (parseInt(amount) === 100000) return templates[100]
    return templates[150]
  }

  static selectTemplateAlert(optionNumber) {
    const templates = {
      1: { name: 'ALERTAS EN DESCUENTOS', text: 'tiene un descuento irregular' },
      2: { name: 'ALERTAS DE COMPRAS SOSPECHOSAS', text: 'tiene un monto irregular' },
      3: { name: 'ALERTAS DE DESCUENTO SIN CUPÓN', text: 'tiene un descuento sin cupón' },
      4: { name: 'avisos de integracion de pedidos', text: '📋 No generó factura' },
      5: {
        name: 'avisos de integracion de pedidos',
        text: '🚛 No ingresó a la plataforma de envío (Getpoint | Fullpi | Urbano)'
      },
      6: { name: 'correo de aviso de stock de seguridad', text: '🌡️ Estos productos alcanzaron su stock de seguridad' },
      7: { name: 'correo de aviso de stock de seguridad', text: '⌛ Estos productos están fuera de stock' }
    }

    const templateName = templates[optionNumber]

    return templateName
  }
  static async emailAlerts(data) {
    try {
      const mailchimpClient = mailchimpTx(Env.get('SMTP_PASSWORD_MAILCHIMP'))
      const { text: subject, name: template } = this.selectTemplateAlert(data.template)
      const teamBetter = Env.get('TEAM_BETTER')?.split(',') || []

      const emailTeam = teamBetter.map(employerEmail => ({
        email: employerEmail.trim(),
        type: 'to',
        name: 'Team Bettercommerce',
        important: true,
        track_opens: true,
        track_clicks: true
      }))

      const varsTeam = teamBetter.map(employerEmail => {
        const vars = [
          { name: 'ORDERID', content: data.order_id },
          ...(data.discount ? [{ name: 'DESCUENTO', content: data.discount }] : []),
          { name: 'CUSTOMER', content: data.customer },
          { name: 'QUANTITY', content: String(data.quantity) },
          { name: 'CUPON', content: data.couponName },
          { name: 'MONTOCUPON', content: String(data.discountAmount) },
          { name: 'TOTAL', content: data.total }
        ]

        return {
          rcpt: employerEmail,
          vars
        }
      })

      const response = await mailchimpClient.messages.sendTemplate({
        template_name: template,
        template_content: [
          { name: 'ORDERID', content: data.order_id },
          ...(data.discount ? [{ name: 'DESCUENTO', content: data.discount }] : []),
          { name: 'CUSTOMER', content: data.customer },
          { name: 'QUANTITY', content: String(data.quantity) },
          { name: 'CUPON', content: data.couponName },
          { name: 'MONTOCUPON', content: String(data.discountAmount) },
          { name: 'TOTAL', content: data.total }
        ],
        message: {
          subject: `Aviso!! pedido ${data.brand}-${data.order_id} ${subject}`,
          from_email: Env.get('CONTACT_EMAIL'),
          from_name: Env.get('MARCA'),
          to: emailTeam,
          merge: true,
          merge_vars: varsTeam
        }
      })

      console.log(response)
      return response
    } catch (error) {
      console.error('Error sending email alerts:', error)
      return { status: error.status || 500, message: error.message || 'Internal Server Error' }
    }
  }
  // Este metodo incluye la logica que envia correos en caso de que durante el proceso de pago no entre un pedido WMS o BSALE
  static async emailWarning(data: CustomAlert) {
    try {
      // console.log('data para email', data)
      const templateListForThisMethod = [4, 5, 6, 7] // numero de templates manejados por este metodo
      if (!templateListForThisMethod.includes(data.templateNumber!)) {
        return { status: 400, message: 'Template not found' }
      }
      const mailchimpClient = mailchimpTx(Env.get('SMTP_PASSWORD_MAILCHIMP'))
      const { text: subject, name: template } = this.selectTemplateAlert(data.templateNumber)
      const teamBetter =
        data.templateNumber == 4
          ? Env.get('TEAM_FOR_BSALE')?.split(',') || []
          : data.templateNumber == 5
          ? Env.get('TEAM_FOR_WMS')?.split(',') || []
          : data.templateNumber == 6
          ? Env.get('TEAM_STOCKPRODUCT')?.split(',') || []
          : Env.get('TEAM_STOCKPRODUCT')?.split(',')

      const emailTeam = teamBetter.map(employerEmail => ({
        email: employerEmail.trim(),
        type: 'to',
        name: 'Team Bettercommerce',
        important: true,
        track_opens: true,
        track_clicks: true
      }))
      const getTemplateContent = data => {
        const commonContent = [
          { name: 'ORDER_ID', content: data.order_id },
          { name: 'MARCA', content: data.brand },
          { name: 'FECHA', content: String(data.date) },
          { name: 'CLIENTE', content: data.customerName },
          { name: 'EMAIL', content: String(data.email) },
          {
            name: 'MONTO',
            content: parseInt(data.total).toLocaleString(Env.get('LOCALE_STRING'), {
              style: 'currency',
              currency: Env.get('CURRENCY_ID')
            })
          }
        ]

        const specialContent = [
          {
            name: 'HEADER',
            content: `https://img.mailinblue.com/4873864/images/content_library/original/${data.brandImage}`
          },
          { name: 'PRODUCTS', content: data.products },
          { name: 'MESSAGE', content: data.message }
        ]

        return [6, 7].includes(data.templateNumber!) ? specialContent : [...commonContent, ...specialContent]
      }
      const varsTeam = teamBetter.map(employerEmail => {
        const vars = getTemplateContent(data)

        return {
          rcpt: employerEmail,
          vars
        }
      })

      const response = await mailchimpClient.messages.sendTemplate({
        template_name: template,
        template_content: getTemplateContent(data),
        message: {
          subject: [6, 7].includes(data.templateNumber!)
            ? subject
            : `Aviso!! pedido ${data.brand}-${data.order_id} ${subject}`,
          from_email: Env.get('CONTACT_EMAIL'),
          from_name: Env.get('MARCA'),
          to: emailTeam,
          merge: true,
          merge_vars: varsTeam
        }
      })

      console.log(response)
      return response
    } catch (error) {
      console.error('Error sending email alerts:', error)
      return { status: error.status || 500, message: error.message || 'Internal Server Error' }
    }
  }
}

export default MailchimpService
