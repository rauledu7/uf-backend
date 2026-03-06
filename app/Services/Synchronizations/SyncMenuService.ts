import Menu from 'App/Models/Menu'
import BigcommerceService from '../BigcommerceService'

export default class SyncMenuService {
  public async syncMenuFromBigcommerce() {
    const categories = await BigcommerceService.getAllCategories()

    const results = await Promise.all(
      categories.map(async categoryData => {
        const searchPayload = { category_id: categoryData.id }
        const persistancePayload = {
          title: categoryData.title,
          url: categoryData.url,
          parent_id: categoryData.parent_id,
          order: categoryData.order,
          image: categoryData.image
        }

        try {
          // Intentar crear o actualizar la categoría
          const existingCategory = await Menu.updateOrCreate(searchPayload, persistancePayload)

          // Si se creó o actualizó correctamente, devolver el objeto
          return existingCategory
        } catch (error) {
          // Si ocurrió un error, devolver un objeto indicando el fallo
          return { error: true, message: error.message }
        }
      })
    )

    return results
  }
}
