import BigcommerceService from '../BigcommerceService'
import Category from 'App/Models/Category'

export default class SyncCategoriesService {
  public async syncCategoriesFromBigcommerce() {
    const categories = await BigcommerceService.getCategories()
    const results = await Promise.all(
      categories.map(async (categoryData: any) => {
        const searchPayload = { category_id: categoryData.category_id }
        let url = categoryData.url ? categoryData.url.path : ''
        const persistancePayload = {
          title: categoryData.name,
          url: url,
          parent_id: categoryData.parent_id,
          order: categoryData.sort_order,
          image: categoryData.image_url,
          is_visible: categoryData.is_visible,
          tree_id: categoryData.tree_id
        }

        try {
          // Intentar crear o actualizar la categoría
          const existingCategory = await Category.updateOrCreate(searchPayload, persistancePayload)

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
