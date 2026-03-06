import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Commune from 'App/Models/Commune'
import Region from 'App/Models/Region'
import EnviameService from 'App/Services/EnviameService'
import GeneralService from 'App/Services/GeneralService'
import PrismicService from 'App/Services/PrismicService'
import Env from '@ioc:Adonis/Core/Env'
import Department from 'App/Models/Department'
import City from 'App/Models/City'
import ShippingType from 'App/Models/ShippingType'
import CityFulppi from 'App/Models/CityFullpi'
import WeightList from 'App/Models/WeightList'
import UrbanoPrice from 'App/Models/UrbanoPrice'
import CitiesPeru from 'App/Models/CitiesPeru'
import DistrictsPeru from 'App/Models/DistrictsPeru'
import DepartmentsPeru from 'App/Models/DepartmentsPeru'
import { COUNTRY } from 'App/Interfaces/Countries'
import SiigoService from 'App/Services/SiigoService'
import BigcommerceService from 'App/Services/BigcommerceService'
import CommunesThiago from 'App/Models/CommunesThiago'
import Thiago from 'App/Models/Thiago'
import cache from 'App/Services/CacheService'
import { get } from 'http'

export default class GlobalsController {
  protected readonly cacheInfoGlobal = `${Env.get('VARIABLE_BRAND')}-${Env.get('COUNTRY_CODE')}-infoglobal`
  protected readonly nodeEnv = Env.get('NODE_ENV') !== 'development'

  public async index({}: HttpContextContract) {
    if (this.nodeEnv && (await cache.has(this.cacheInfoGlobal))) {
      return await cache.get(this.cacheInfoGlobal)
    }
    const getGlobalSettings = await PrismicService.getGlobalSettings()
    if (this.nodeEnv) {
      await cache.set(this.cacheInfoGlobal, getGlobalSettings)
    }
    return getGlobalSettings
  }

  public async pickup({}: HttpContextContract) {
    const getPickupStores = await PrismicService.getStores()
    return getPickupStores
    // const getPickupStores = await GeneralService.getPickupStores(
    //   Number(Env.get('BIGCOMMERCE_CHANNEL_ID')),
    //   'pickup_store'
    // )
    const pickups = getPickupStores.filter(pickup => pickup.visibility !== 'false')
    return pickups
  }

  public async enviame({ params }: HttpContextContract) {
    let priceShipping: number
    const commune_thiago = await CommunesThiago.query().where('name', '=', decodeURIComponent(params.commune))

    if (commune_thiago.length > 0) {
      const value_thiago = await Thiago.query()
        .where('min_weight', '<=', params.weight)
        .andWhere(query => {
          query.where('max_weight', '>=', params.weight).orWhereNull('max_weight')
        })
        .firstOrFail()

      const price = value_thiago ? value_thiago.value : 'Precio de envío no disponible'

      return price
    }

    priceShipping = await EnviameService.getPriceShipping(params.weight, params.commune)

    return priceShipping
  }

  public async regions({}: HttpContextContract) {
    if (COUNTRY.PE === Env.get('LOCATION')) {
      const departments = await DepartmentsPeru.query().select(['id', 'department'])
      return departments.map(e => ({ id: e.id, region: e.department }))
    }

    const regions = await Region.query().select(['id', 'region'])

    return regions
  }

  public async communes_by_region({ params }: HttpContextContract) {
    if (COUNTRY.PE === Env.get('LOCATION')) {
      const cities = await CitiesPeru.query().where('id_department', params.region_id).where('traslate', '>=', 0)
      return cities.map(elem => ({ id: elem.id, commune: elem.city }))
    }
    const communes = await Commune.query().where('region_id', params.region_id).preload('region')
    return communes?.map(elem => ({ id: elem.id, commune: elem.commune }))

    // await Promise.all(
    //   communes.map(async function (elem, _index) {
    //     let returnCommune = { id: elem.id, commune: elem.commune }
    //     arrayCommunes.push(returnCommune)
    //   })
    // )
  }
  public async popUps({}: HttpContextContract) {
    const viewPopups = (await PrismicService.getGlobalSettings()).popups_home
    return viewPopups
  }
  public async bannerInHome({}: HttpContextContract) {
    const viewBanner = (await PrismicService.getGlobalSettings()).banner_home
    return viewBanner
  }

  public async deparments_PE({}: HttpContextContract) {
    const departments = await DepartmentsPeru.query().select(['id', 'department'])

    return departments
  }
  //codigo para el servicio de armado en el checkout de UF PE
  public async departements({}: HttpContextContract) {
    try {
      const departments = await DepartmentsPeru.query().orderBy('department', 'asc').select('id', 'department')

      const getCities = await Promise.all(
        departments.map(async item => {
          try {
            const cities = await DistrictsPeru.query()
              .whereHas('province', query => {
                query.where('provinces_peru.id_department', item.id).orderBy('name', 'asc')
              })
              .preload('province')

            const arrayCities = cities.map(elem => ({
              code: elem.id,
              city: `${elem.province.name} - ${elem.name}`
            }))

            return {
              region: item.department,
              comunas: arrayCities.sort((a, b) => a.city.localeCompare(b.city)).map(item => item.city)
            }
          } catch (error) {
            console.error(`Error fetching cities for department ${item.department}: ${error}`)
            return {
              region: item.department,
              comunas: []
            }
          }
        })
      )

      return { regiones: getCities }
    } catch (error) {
      console.error(`Error fetching departments: ${error}`)
      return { regiones: [] }
    }
  }
  public async cities_PE({ params }: HttpContextContract) {
    let arrayCities: any = []
    const cities = await DistrictsPeru.query()
      .whereHas('province', query => {
        query.where('provinces_peru.id_department', params.department_id)
      })
      .preload('province')

    cities.map(async function (elem, _index) {
      let returnCommune = { code: elem.ubigeo, city: `${elem.province.name} - ${elem.name}` }
      arrayCities.push(returnCommune)
    })

    return arrayCities
  }
  public async shipping_PE({ params }: HttpContextContract) {
    const { weight, code: ubigeo } = params
    const parseWeight = parseFloat(weight)

    try {
      // Obtengo la ciudad según el código recibido desde el front el cual corresponde al ubigeo del distrito
      const city = await DistrictsPeru.query().where('ubigeo', ubigeo).first()
      if (!city) return { error: 'Ciudad no encontrada.' }

      const shippingZoneId = city.id_shipping_zone

      // Función auxiliar para obtener el precio de envío
      const getShippingPrice = async (weight: number) => {
        const shippingWeight = await WeightList.query().where('min', '<', weight).where('max', '>=', weight).first()

        if (!shippingWeight) throw new Error('No se encontró un rango de peso válido.')

        const urbanoPrice = await UrbanoPrice.query()
          .where('id_shipping_zone', shippingZoneId)
          .where('id_weight_list', shippingWeight.id)
          .first()

        return urbanoPrice ? urbanoPrice.price : null // Retorna el precio o null
      }

      let priceShipping =
        parseWeight < 200
          ? await getShippingPrice(parseWeight)
          : await getShippingPrice(200).then(async basePrice => {
              if (basePrice === null) throw new Error('No se encontró el precio de envío para el peso base.')

              const pricePerKilo = await UrbanoPrice.query()
                .where('id_shipping_zone', shippingZoneId)
                .where('id_weight_list', 12) // Asumiendo que 12 es el ID para el precio por kilo
                .first()

              if (!pricePerKilo) throw new Error('No se encontró el precio por kilo.')

              return basePrice + (parseWeight - 200) * pricePerKilo.price
            })

      if (priceShipping === null) return { error: 'No se pudo calcular el costo de envío.' }

      return Math.round(priceShipping) // Retorna el precio redondeado
    } catch (error) {
      console.error('Error al calcular el costo de envío:', error.message)
      return {
        error: 'Ocurrió un error al calcular el costo de envío. Intente nuevamente más tarde.'
      }
    }
  }
  public async deparments_CO({}: HttpContextContract) {
    const departments = await Department.query().select(['id', 'department'])

    return departments
  }

  public async cities_CO({ params }: HttpContextContract) {
    let arrayCities: any = []
    const cities = await City.query().where('department_id', params.department_id).preload('department')

    await Promise.all(
      cities.map(async function (elem, _index) {
        let returnCommune = { id: elem.id, city: elem.name, code: elem.code }
        arrayCities.push(returnCommune)
      })
    )

    return arrayCities
  }

  public async shipping_CO({ params }: HttpContextContract) {
    let weight = params.weight
    let priceShipping: number = 0
    //obtengo la ciudad segun el codigo recibido desde el front
    const city = await City.query().where('code', params.code).select('name').first()

    //en la tabla de fulppi busco la coincidencia segun el nombre
    if (city) {
      let city_fulppi = await CityFulppi.query().where('name', 'ilike', city.name).first()

      //busco el tipo de envio que corresponde a la ciudad seleccionada
      if (city_fulppi) {
        let type = await ShippingType.find(city_fulppi.type_id)
        // return type
        if (type) {
          //segun el peso del pedido envio el monto final
          if (weight >= 0 && weight <= 1) {
            priceShipping = type.weight1kg
          } else if (weight > 1 && weight <= 2) {
            priceShipping = type.weight2kg
          } else if (weight > 2 && weight <= 3) {
            priceShipping = type.weight3kg
          } else if (weight > 3 && weight <= 4) {
            priceShipping = type.weight4kg
          } else if (weight > 4 && weight <= 5) {
            priceShipping = type.weight5kg
          } else if (weight > 5 && weight <= 30) {
            priceShipping = city_fulppi.weight5to30kg
          } else if (weight > 30) {
            let extra = (Number(weight) - 30) * city_fulppi.weightover30kg
            priceShipping = city_fulppi.weight5to30kg + extra
          }

          return priceShipping
        }
      }

      return null
    }
  }

  public async bulkSiigo({ request }: HttpContextContract) {
    const body = request.body()
    await Promise.all(
      body.map(async e => {
        const siigo = await SiigoService.create_docs(e, Env.get('SIIGO_ID_DEBITO'))

        if (siigo.status == 200) {
          await BigcommerceService.setMetafieldByOrder({ id: e }, String(siigo.message.id), 'ct_order_id', 'order_id')
        }
      })
    )
  }
}
