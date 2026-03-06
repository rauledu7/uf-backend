import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import GiftCardsService from 'App/Services/GiftCardsService'

export default class GiftCardsController {
  public async index({}: HttpContextContract) {}

  public async create({}: HttpContextContract) {}

  public async store({ request }: HttpContextContract) {
    const dataForm: any = request.body()

    if (!Array.isArray(dataForm)) {
      const result = await GiftCardsService.create(dataForm)
      return result
    }

    // Usamos flatMap para crear un array de promesas
    const promises = dataForm.flatMap(elem => {
      const quantity = elem.quantity || 1 // Si no hay quantity, por defecto es 1
      return Array.from({ length: quantity }, () => {
        const { quantity, ...giftCardData } = elem // Excluye quantity del payload
        return GiftCardsService.create(giftCardData)
      })
    })

    // Esperamos a que todas las promesas se resuelvan
    const results = await Promise.all(promises)
    return results
  }

  public async show({ params }: HttpContextContract) {
    return GiftCardsService.read(params.code)
  }

  public async edit({}: HttpContextContract) {}

  public async update({ request }: HttpContextContract) {
    const data_form: any = request.body()
    if (!data_form.id) {
      throw new Error('ID is required to update a gift card')
    }
    return GiftCardsService.update(data_form.id, { balance: data_form.balance })
  }

  public async updateExpireDate({ request }: HttpContextContract) {
    const dataForm: Record<string, any> | Record<string, any>[] = request.body()
    //Recibe un objeto o un arreglo de objetos
    /*
     * [{"code":"7EO-28Z-N14-UVA"},{"code":"7EO-28Z-N14-UVA"}]
     */

    if (!dataForm) {
      throw new Error('Se requiere nueva información para actualizar la fecha de expiración de la gift card.')
    }
    if (Array.isArray(dataForm) && dataForm.length > 0) {
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + 9)
      const expiryDateString = expiryDate.toUTCString()

      const updates = await Promise.all(
        dataForm.map(async item => {
          const giftCardInfo = await GiftCardsService.read(item.code)
          const dataGiftCard = giftCardInfo?.data?.[0]
          if (!dataGiftCard) {
            throw new Error(`No se encontró información válida para la gift card con ID ${item.id}`)
          }

          dataGiftCard.expiry_date = expiryDate
          return GiftCardsService.updateExpireDate(dataGiftCard.id, { expiry_date: expiryDateString })
        })
      )

      return updates
    }

    throw new Error('Se debe proporcionar un arreglo con al menos un elemento para actualizar.')
  }

  public async destroy({}: HttpContextContract) {}
}
