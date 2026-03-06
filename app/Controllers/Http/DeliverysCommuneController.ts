import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import DeliverysCommuneService from 'App/Services/DeliverysCommuneService'
import DeliverysCommune from 'App/Models/DeliverysCommune'

export default class DeliverysCommuneController {
  public async getAllCommunesInfo({ response, request }: HttpContextContract) {
    try {
      const { commune } = request.all()
      if (commune) {
        try {
          const communeByName = await DeliverysCommuneService.getCommuneDeliveryByName(commune)
          if (!communeByName || communeByName.length === 0) {
            response.status(404).json({ mensaje: 'No se encontró comuna por el nombre proporcionado.' })
          } else {
            response.status(200).json(communeByName)
          }
        } catch (error) {
          response.status(500).json({
            mensaje: 'Error al intentar obtener  los datos de la comuna proporcionada.',
            error: error.message
          })
        }
      } else {
        const AllCommunesInfo = await DeliverysCommuneService.getAllDeliverysCommune()
        response.status(200).json(AllCommunesInfo)
      }
    } catch (error) {
      response.status(500).json({
        mensaje: 'Error al intentar obtener  los datos de todas las comunas.',
        error: error.message
      })
    }
  }

  public async getCommuneById({ params, response }: HttpContextContract) {
    try {
      const { id } = params
      const communeById: DeliverysCommune | null = await DeliverysCommuneService.getCommuneDeliveryById(id)
      if (communeById) {
        response.status(200).json(communeById)
      } else {
        response.status(404).json({
          mensaje: 'No se encontró registro con el ID proporcionado. Por favor intente con otro'
        })
      }
    } catch (error) {
      response.status(500).json({ mensaje: 'Error al obtener la comuna por ID.', error: error.message })
    }
  }
  public async updateCommuna({ params, response, request }: HttpContextContract) {
    try {
      const { id } = params
      const data: Partial<DeliverysCommune> = request.body()
      const communa = await DeliverysCommuneService.UpdateCommuneDelivery(id, data)
      response.status(201).json(communa)
    } catch (error) {
      response.status(500).json({ error: error.message })
    }
  }
  public async saveDataInDB({ response }: HttpContextContract) {
    try {
      // Realizo una consulta para verificar si ya existen datos en la tabla
      const existingData = await DeliverysCommuneService.getAllDeliverysCommune()

      if (existingData.length === 0) {
        // Si no hay datos en la tabla, ejecuto  el proceso de carga
        await DeliverysCommuneService.loadDataFromJson()
        response.status(201).json({ mensaje: 'Las Comunas fueron cargados en la base de datos correctamente.' })
      } else {
        // Si ya existen datos, responde con un mensaje indicando que no es necesario volver a cargarlos
        response.json({ mensaje: 'Los datos ya están en la base de datos.' })
      }
    } catch (error) {
      response.status(500).json({ mensaje: 'Error al cargar los datos en la base de datos.', error: error.message })
    }
  }

  public async sameDay({ response, request }: HttpContextContract) {
    try {
      const body = request.body()
      if (!body) throw new Error('Invalid request. Please provide the list of communes.')

      const listCommunes = body.communes

      let { express } = request.all()
      if (!express) throw new Error('Invalid request. The "express" parameter must be provided')

      express = express.toUpperCase()
      if (express != 'TRUE' && express != 'FALSE')
        throw new Error('Invalid request. The "express" parameter must be provided with a boolean value.')
      return await DeliverysCommuneService.setExpressDeliveryTimesInCommune(listCommunes, express)
    } catch (error) {
      console.error('Error en la solicitud:', error.message)
      response.status(400).json({ success: false, message: error.message })
    }
  }
  public async getDeliveryTypePeru({ response, request }: HttpContextContract) {
    try {
      const { id } = request.all()
      if (!id) {
        return response.status(404).json({ mensaje: 'No se encontró la comuna por el id proporcionado.' })
      }
      const delivery = await DeliverysCommuneService.getDeliveryPeru(id)
      return response.status(200).json([delivery])
    } catch (error) {
      return response.status(500).json({
        mensaje: 'Error al intentar obtener  los datos de todas las comunas.',
        error: error.message
      })
    }
  }
}
