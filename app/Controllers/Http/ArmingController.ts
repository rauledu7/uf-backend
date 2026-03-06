import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import ArmingServices from 'App/Services/ArmingServices'

/** controlador para guardar los departamentos en la DB */
export default class ArmingController {
  public async saveDepartaments({ response }: HttpContextContract) {
    try {
      const loadDepartaments = await ArmingServices.saveDatabaseRegions()
      response.status(201).json(loadDepartaments)
    } catch (error) {
      console.error(error.message)
      response.status(500).json({ Error: error.message })
    }
  }

  /** controlador para guardar las ciudades o poblaciones en la DB*/
  public async saveCities({ response }: HttpContextContract) {
    try {
      /* para guardar productos de armado */
      const loadCities = await ArmingServices.saveDatabaseMunicipalities()
      response.status(201).json(loadCities)
    } catch (error) {
      console.error(error.message)
      response.status(500).json({ Error: error.message })
    }
  }

  /** controlador para guardar los productos con servicio  de armado en la DB */
  public async saveArmingProducts({ response }: HttpContextContract) {
    try {
      const loadArmingProducts = await ArmingServices.saveDatabaseProductsArming()
      response.status(201).json(loadArmingProducts)
    } catch (error) {
      console.error(error.message)
      response.status(500).json({ Error: error.message })
    }
  }
}
