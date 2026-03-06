import Commune from 'App/Models/Commune'
import Product from 'App/Models/Product'
import Region from 'App/Models/Region'
import fs from 'fs'
import path from 'path'

export default class ArmingServices {
  static async saveDatabaseRegions() {
    try {
      const routeBase = path.join(__dirname, '..', '..')

      let contentArchiveJSON: any = path.join(routeBase, 'departamentos-colombia.json')
      contentArchiveJSON = fs.readFileSync(contentArchiveJSON, 'utf-8')
      contentArchiveJSON = JSON.parse(contentArchiveJSON)
      contentArchiveJSON = Object.values(contentArchiveJSON)
      type Region = { region: string }

      let regionList: string[] = []

      for (const dato of contentArchiveJSON) {
        const { departamento: region } = dato
        regionList.push(region)
      }
      regionList = [...new Set(regionList)]
      const insertRegions: Region[] = regionList.map(region => ({ region: region }))

      await Region.createMany(insertRegions)

      return {
        message: 'Los Departamentos de colombia fueron insertados en la base de datos correctamente.'
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }
  static async saveDatabaseMunicipalities() {
    try {
      const routeBase = path.join(__dirname, '..', '..')

      let contentArchiveJSON: any = path.join(routeBase, 'departamentos-colombia.json')
      contentArchiveJSON = fs.readFileSync(contentArchiveJSON, 'utf-8')
      contentArchiveJSON = JSON.parse(contentArchiveJSON)
      contentArchiveJSON = Object.values(contentArchiveJSON)

      type Commune = { commune: string; region_id: number; traslate: string; surcharge: number }
      const dataCommune: Commune[] = []

      for (const dato of contentArchiveJSON) {
        const { departamento: region, ciudad: commune, punto: traslate, recargo: surcharge } = dato
        const regionID = await Region.query().where('region', region.toUpperCase()).first()
        if (regionID) {
          const communeData = {
            commune: commune,
            region_id: regionID.id,
            traslate: traslate.toUpperCase(),
            surcharge: surcharge
          }
          dataCommune.push(communeData)
        } else {
          throw new Error(`La región '${region}' no se encontró en la base de datos.`)
        }
      }
      await Commune.createMany(dataCommune)

      return {
        message: 'Las ciudades o Poblaciones  fueron insertados en la base de datos correctamente.'
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }

  static async saveDatabaseProductsArming() {
    try {
      const routeBase = path.join(__dirname, '..', '..')

      let contentArchiveJSON: any = path.join(routeBase, 'colombia-armado-productos.json')
      contentArchiveJSON = fs.readFileSync(contentArchiveJSON, 'utf-8')
      contentArchiveJSON = JSON.parse(contentArchiveJSON)
      contentArchiveJSON = Object.values(contentArchiveJSON)
      type Data = { sku: string; price_value: number | string }
      const productsArming: any[] = []

      for (const dato of contentArchiveJSON[0]) {
        const { sku: sku, valor: price_value } = dato

        const product: Data = {
          sku,
          price_value
        }
        productsArming.push(product)
      }
      await Product.createMany(productsArming)

      return {
        message: 'Productos con servicio de armado  guardados en la base de datos correctamente.'
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }

  static async getRegions(regions = false) {
    try {
      if (regions) {
        return await Region.findBy('id', regions)
      } else {
        return await Region.all()
      }
    } catch (error) {}
  }

  static async getMunicipalities(Municipalities = false) {
    try {
      if (Municipalities) {
        return await Commune.all()
      }
    } catch (error) {}
  }

  // static async getProductsArming(sku = false) {}

  // static async updateDatabaseRegions(regionsID) {
  //   try {
  //   } catch (error) {}
  // }

  // static async updateDatabaseMunicipalities(MunicipalitiesID) {
  //   try {
  //   } catch (error) {}
  // }

  // static async updateDatabaseProductsArming(skuID) {
  //   try {
  //   } catch (error) {}
  // }
}
