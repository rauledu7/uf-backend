// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

//import Category from "App/Models/Category";
import Filter from 'App/Models/Filter'
import Option from 'App/Models/Option'
import BigcommerceService from 'App/Services/BigcommerceService'
import Env from '@ioc:Adonis/Core/Env'

export default class AdvancedsController {
  public async syncFiltersFromBigcommerce() {
    const results: any = []
    const categories = await BigcommerceService.getAllCategories('', 0)
    const filters = categories.filter(item => item.title === 'Filtros')
    filters.forEach(async parent => {
      // Obtener los hijos de cada elemento "Filtros"
      const children = categories.filter(item => item.parent_id === parent.id)
      // Guardar cada hijo en el modelo filters
      children.forEach(async child => {
        try {
          // Crear un nuevo registro en el modelo filters para cada hijo
          const savedFilter = await Filter.updateOrCreate(
            { category_id: child.id },
            {
              category_id: child.id,
              name: child.title
            }
          )
          console.log(savedFilter)

          // Almacenar el resultado
          results.push({
            ...child,
            id: savedFilter.id
          })
        } catch (error) {
          console.error(`Error al guardar ${child.title}: ${error.message}`)
        }
      })
    })

    return 'Proceso completado'
  }

  public async syncOptionsFromBigcommerce() {
    const results: any = []
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
        console.log(savedFilter)

        // Almacenar el resultado
        results.push({
          ...child,
          id: savedFilter.id
        })
      } catch (error) {
        console.error(`Error al guardar ${child.title}: ${error.message}`)
      }
    })

    return 'Proceso completado'
  }

  public async syncProductOptionsFromBigcommerce() {
    const results: any = []
    let productsData: any[] = []

    //obtener productos por canal
    const products_by_channel = await BigcommerceService.getProductsByChannel(Env.get('BIGCOMMERCE_CHANNEL_ID'))

    //validar cuantas paginas existen disponibles de productos
    const products_by_page_by_channel = products_by_channel.meta.pagination.total_pages
    const batchSize = 2000 // Tamaño del lote de carga

    const fetchProductsPerPage = async page => {
      try {
        const productsPerChannel = await BigcommerceService.getProductsByChannel(
          Env.get('BIGCOMMERCE_CHANNEL_ID'),
          page
        )

        const productIds = productsPerChannel.data.map(({ product_id }) => product_id)
        const productsPerPage = await BigcommerceService.getAllProductsRefactoring(productIds, 0)
      } catch (error) {
        console.error(`Error processing page ${page}:`, error)
        return []
      }
    }

    const pages = Array.from({ length: products_by_page_by_channel }, (_, i) => i + 1)

    try {
      const productsPerPagePromises = pages.map(fetchProductsPerPage)
      return productsPerPagePromises

      const productsPerPageResults = await Promise.all(productsPerPagePromises)
      console.log(productsPerPageResults.length)
      productsData = productsPerPageResults.flat()
      console.log(productsData.length)
      return productsData
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }
}
