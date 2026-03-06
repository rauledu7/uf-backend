import Filter from 'App/Models/Filter'
import BigcommerceService from '../BigcommerceService'
import Option from 'App/Models/Option'

export default class SyncOptionsService {
  public async syncOptionsFromBigcommerce() {
    const results: any[] = []
    const filters = await Filter.all()
    const categoryIdsFilters = filters.map(item => item.category_id)

    const childsFilters = await BigcommerceService.getCategoriesByParent(categoryIdsFilters, 0)
    childsFilters.data.forEach(async child => {
      try {
        // Crear un nuevo registro en el modelo filters para cada hijo
        const savedFilter = await Option.updateOrCreate(
          { category_id: child.category_id },
          {
            category_id: child.category_id,
            name: child.name,
            filter_id: child.parent_id
          }
        )

        // Almacenar el resultado
        results.push({
          ...child,
          id: savedFilter.id
        })
      } catch (error) {
        console.error(`Error al guardar ${child.title}: ${error.message}`)
      }
    })

    return await Option.all()
  }
}
