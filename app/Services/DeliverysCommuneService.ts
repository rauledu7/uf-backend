import fs from 'fs'
import path from 'path'
import DeliverysCommune from 'App/Models/DeliverysCommune'
import { Communes, Commune } from 'App/Interfaces/DeliverysCommuneInterface'
import DistrictsPeru from 'App/Models/DistrictsPeru'
import ProvincesPeru from 'App/Models/ProvincesPeru'
import DepartmentsPeru from 'App/Models/DepartmentsPeru'
import ShippingZonesPeru from 'App/Models/ShippingZonesPeru'

class DeliverysCommuneService {
  static async loadDataFromJson() {
    try {
      const routeBase = path.join(__dirname, '..', '..')

      let contentArchiveJSON: string | Array<Communes> = path.join(routeBase, 'deliverys-communes.json')
      contentArchiveJSON = fs.readFileSync(contentArchiveJSON, 'utf-8')
      contentArchiveJSON = JSON.parse(contentArchiveJSON)
      contentArchiveJSON = Object.values(contentArchiveJSON)

      for (const dato of contentArchiveJSON) {
        const {
          Comunne: commune,
          'Lead Time': lead_time,
          'Delivery Time': delivery_time,
          'Express Lead Times': express_lead_times,
          'Express Delivery Times': express_delivery_times
        } = dato
        const communeInfo = {
          commune,
          lead_time,
          delivery_time,
          express_lead_times,
          express_delivery_times
        }
        await DeliverysCommune.create(communeInfo)
      }
      return { message: 'Datos insertados en la base de datos correctamente.' }
    } catch (error) {
      console.error('Error al procesar el archivo JSON:', error.message)
    }
  }
  static async loadData() {
    try {
      const routeBase = path.join(__dirname, '..', '..')

      let contentArchiveJSON: any = path.join(routeBase, 'urbano.json')
      contentArchiveJSON = fs.readFileSync(contentArchiveJSON, 'utf-8')
      contentArchiveJSON = JSON.parse(contentArchiveJSON)

      const dataArray = contentArchiveJSON.matriz

      // Crear un array para departamentos
      let departments: any = []
      let provinces: any = []
      let districts: any = []

      // Usar un Set para evitar duplicados de departamentos
      const departmentSet = new Set()
      const provinceSet = new Set()
      // Iterar sobre los datos
      for (const item of dataArray) {
        const { UBIGEO, DEPARTAMENTO, PROVINCIA, DISTRITO, AMBITO /*TIEMPO_DE_ENTREGA, BIG_TICKET  */ } = item

        // Agregar departamento si no existe
        if (!departmentSet.has(DEPARTAMENTO)) {
          const departmentId = departments.length + 1 // ID ascendente
          departments.push({ id: departmentId, department: DEPARTAMENTO })
          departmentSet.add(DEPARTAMENTO)
        }

        if (!provinceSet.has(PROVINCIA)) {
          // Agregar provincia
          const provinceId = provinces.length + 1 // ID ascendente
          provinces.push({ id: provinceId, name: PROVINCIA, department: DEPARTAMENTO })
          provinceSet.add(PROVINCIA)
        }

        // Agregar distrito
        districts.push({ id: UBIGEO, name: DISTRITO, province: PROVINCIA, zona: AMBITO })
      }

      console.log(departments)
      console.log(provinces)
      console.log(districts)
      departments = departments
        .map(itemsProducts => {
          delete itemsProducts.id
          return itemsProducts
        })
        .flat()
      provinces = provinces
        .map(itemsProducts => {
          delete itemsProducts.id
          return itemsProducts
        })
        .flat()
      districts = districts
        .map(item => ({
          ubigeo: item.id,
          name: item.name,
          province: item.province,
          zona: item.zona
        }))
        .flat()
      console.log(departments)
      console.log(provinces)
      console.log(districts)
      // Insertar departamentos uno a uno
      for (const department of departments) {
        await DepartmentsPeru.updateOrCreate(
          { department: department.department }, // Condición para encontrar el registro
          { department: department.department } // Datos a insertar o actualizar
        )
      }

      // Insertar provincias uno a uno
      for (const province of provinces) {
        try {
          console.log('province', province)
          const department = await DepartmentsPeru.findBy('department', province.department)
          if (department !== null) {
            const id_department = department.id
            console.log('id_department', id_department)
            await ProvincesPeru.updateOrCreate(
              { name: province.name, id_department: id_department }, // Condición para encontrar el registro
              { name: province.name, id_department: id_department } // Datos a insertar o actualizar
            )
          }
        } catch (error) {
          console.log(error.detail)
        }
      }

      // Insertar distritos uno a uno
      for (const district of districts) {
        console.log(district)
        const province = await ProvincesPeru.findBy('name', district.province)
        const zona = await ShippingZonesPeru.findBy('name', district.zona)
        if (province !== null && zona !== null) {
          try {
            const id_province = province.id
            const id_department = province.id_department
            const id_zona = zona.id
            console.log({ name: district.name, id_province: id_province, ubigeo: district.ubigeo })
            await DistrictsPeru.updateOrCreate(
              {
                ubigeo: district.ubigeo,
                id_department: id_department,
                id_province: id_province,
                id_shipping_zone: id_zona
              }, // Condición para encontrar el registroß
              {
                name: district.name,
                id_province: id_province,
                ubigeo: district.ubigeo,
                id_department: id_department,
                id_shipping_zone: id_zona
              } // Datos a insertar o actualizar
            )
          } catch (error) {
            console.log(error)
          }
        }
      }

      return 'Datos guardados correctamente'
    } catch (error) {
      console.error('Error al procesar el archivo JSON:', error.message)
    }
  }
  static async getAllDeliverysCommune(): Promise<DeliverysCommune[]> {
    const allInfo = await DeliverysCommune.query().orderBy('id', 'asc')

    return allInfo
  }
  static async getCommuneDeliveryById(id: string): Promise<DeliverysCommune | null> {
    let communeById = await DeliverysCommune.find(id)

    return communeById
  }
  static async getCommuneDeliveryByName(nameCommune: string): Promise<DeliverysCommune[]> {
    let name = nameCommune.replace(/\s+/g, ' ').trim().toUpperCase()
    const communeByName = await DeliverysCommune.query().where('commune', name.toUpperCase())

    return communeByName
  }

  static async UpdateCommuneDelivery(id: number, dataUpdate: Partial<DeliverysCommune>) {
    try {
      const commune = await DeliverysCommune.find(id)
      if (!commune) {
        throw new Error('No hay comuna por el id proporcionado')
      }
      commune.merge(dataUpdate)
      await commune.save()

      return { message: 'Comuna actualizada correctamente.', commune_updated: commune }
    } catch (error) {
      return {
        Error: 'Error al actualizar los datos proporcionados a la comuna correspondiente comuna: ' + error.message
      }
    }
  }

  static async setExpressDeliveryTimesInCommune(ListCommunes: Commune[], deliveryExpress: boolean) {
    try {
      const successUpdateCommune: string[] = []
      const failedUpdatecommune: string[] = []
      await Promise.all(
        ListCommunes.map(async commune => {
          //TODO: Buscar  la comuna en la base de datos
          const deliveryCommune: DeliverysCommune | null = await DeliverysCommune.findBy('commune', commune.commune)

          if (deliveryCommune) {
            deliveryCommune.express_delivery_times = deliveryExpress //TODO: si esta en true, estas comunas contarán con delivery express
            await deliveryCommune.save()
            successUpdateCommune.push(deliveryCommune.commune)
          } else {
            //TODO: Manejar el caso en el que la comuna no se encuentra en la base de datos

            failedUpdatecommune.push(commune.commune)
            console.error(`No se encontró la comuna ${commune} en la base de datos.`)
          }
        })
      )

      return {
        success: true,
        message: 'Tiempos de entrega express actualizados correctamente.',
        communesUpdated: successUpdateCommune,
        communesFailed: failedUpdatecommune
      }
    } catch (error) {
      console.error('Error al actualizar los tiempos de entrega express:', error)
      return {
        success: false,
        message: 'Error al actualizar los tiempos de entrega express.',
        type: error
      }
    }
  }
  static async getDeliveryPeru(id) {
    try {
      let district = await DistrictsPeru.query()
        .preload('province', query => {
          query.preload('department')
        })
        .where('ubigeo', id)
        .first()

      // let city = await CitiesPeru.query()
      //   .where('city', district!.name)
      //   .where('id_department', district!.province.department.id)
      //   .first()
      if (district !== null) {
        const key = district.ubigeo
        const communeById = await DeliverysCommuneService.getCommuneDeliveryById(key)
        return communeById
      }
    } catch (error) {
      return { status: 404, message: 'Hubo un error al obtener los datos de envio' }
    }
  }
}

export default DeliverysCommuneService
