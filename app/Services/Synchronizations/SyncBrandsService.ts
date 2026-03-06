import Brand from 'App/Models/Brand'
import BigcommerceService from '../BigcommerceService'

export default class SyncBrandsService {
  public async syncBrandsFromBigcommerce() {
    try {
      const brands = await BigcommerceService.getBrands()
      // Mapea los datos de marcas para crear un nuevo arreglo con las marcas actualizadas o nuevas
      const promises = brands.map(async brandData => {
        // Busca la marca en la base de datos por su ID
        const existingBrand = await Brand.find(brandData.id)

        if (existingBrand) {
          // Si la marca ya existe, actualiza su nombre
          existingBrand.name = brandData.title
          await existingBrand.save()
        } else {
          // Si la marca no existe, crea una nueva entrada
          await Brand.create({
            brand_id: brandData.id,
            name: brandData.title
            // Aquí puedes agregar más campos si es necesario
          })
        }
      })

      // Espera a que todas las promesas se resuelvan
      await Promise.all(promises)

      // Retorna un mensaje indicando que se completó el proceso
      return await Brand.all()
    } catch (error) {
      throw new Error(`Error sincronizando marcas desde Bigcommerce: ${error.message}`)
    }
  }
}
