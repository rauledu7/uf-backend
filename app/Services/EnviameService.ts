import Env from '@ioc:Adonis/Core/Env'
import Commune from 'App/Models/Commune'
import axios from 'axios'

class EnviameService {
  static async getPriceShipping(weight, commune) {
    try {
      const getCommune = await Commune.findBy('commune', decodeURIComponent(commune))
      const courrier = getCommune?.is_fedex ? 'FDX' : 'SKN'

      const results = await axios.get(
        Env.get('ENVIAME_URL') +
          'prices?weight=' +
          weight +
          '&from_place=renca&to_place=' +
          commune.toLowerCase() +
          '&carrier=' +
          courrier,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': Env.get('TOKEN_ENVIAME'),
            Accept: 'application/json'
          }
        }
      )

      const services = results.data?.data?.[0]?.services ?? []

      if (getCommune?.is_fedex) {
        const expressCarrier = services.find(carrier => carrier?.code?.toLowerCase() === 'express')
        return expressCarrier?.price ?? false
      }

      const normalCarrier = services.find(carrier => carrier?.code?.toLowerCase() === 'normal')
      return normalCarrier?.price ?? false
    } catch (error) {
      console.error('Error en getPriceShipping:', error)
      return false
    }
  }
}
export default EnviameService
