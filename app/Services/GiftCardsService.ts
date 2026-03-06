import BigcommerceService from './BigcommerceService'
import MailchimpService from './MailchimpService'

class GiftCardsService {
  static async create(payload: {
    to_name: string
    to_email: string
    from_name: string
    from_email: string
    amount: string
    currency_code: string
  }) {
    try {
      // Fecha de compra: ahora
      const purchase_date = new Date().toUTCString()
      // Fecha de expiración: +9 meses
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + 9)
      const expiryDateString = expiryDate.toUTCString()

      const extendedPayload = {
        ...payload,
        purchase_date,
        expiry_date: expiryDateString
      }

      const giftCard = await BigcommerceService.createGiftCard(extendedPayload)

      if (giftCard?.data?.id) {
        const { to_email, to_name } = giftCard.data

        // crear contacto en Mailchimp
        await MailchimpService.addContactSingle(to_email, to_name)

        // envío del correo de gift card
        await MailchimpService.sendEmilTemplatGiftCard(giftCard)
      }

      return giftCard
    } catch (error) {
      console.error('Error al crear la gift card:', error)
      throw new Error('No se pudo crear la gift card') // o relanzar el error original si prefieres
    }
  }

  static async read(code: string) {
    return await BigcommerceService.getGiftCard(code)
  }

  static async update(id, payload: { balance: string }) {
    return await BigcommerceService.updateGiftCard(id, payload)
  }
  static async updateExpireDate(id, payload) {
    return await BigcommerceService.updateGiftCard(id, payload)
  }
  static async delete(id) {
    return await BigcommerceService.deleteGiftCard(id)
  }
}

export default GiftCardsService
