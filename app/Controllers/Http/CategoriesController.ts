import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BigcommerceService from 'App/Services/BigcommerceService'
import GeneralService from 'App/Services/GeneralService'
import Env from '@ioc:Adonis/Core/Env'
import Category from 'App/Models/Category'

export default class CategoriesController {
  public async index({}: HttpContextContract) {
    const metafields_categories = await BigcommerceService.getMetafieldsByChannel(
      Number(Env.get('BIGCOMMERCE_CHANNEL_ID')),
      'all_categories'
    )
    let categories = BigcommerceService.getAllCategories(metafields_categories)

    return categories
  }

  public async show({ params }: HttpContextContract) {
    const { id } = params

    const getCategory = await BigcommerceService.getCategory(id)

    return getCategory
  }

  public async filter({ params }: HttpContextContract) {
    const id = params.parent == 0 ? params.id : params.parent
    const brand = params.brand_id ?? 0
    let categories = await GeneralService.getCategoriesFilterCollection(id)

    if (categories == null) {
      categories = []
    }

    // let bottom_banner = await BigcommerceService.getMetafieldsByCategory(id, 'product_featured_categories')
    // if (bottom_banner.length > 0) {
    //   bottom_banner = JSON.parse(bottom_banner)
    //   const product_featured = await BigcommerceService.getProductBySku(bottom_banner.product)
    //   bottom_banner.product = product_featured
    // }
    const productsByCategory = await BigcommerceService.getProductsByCategories(id)
    //obtener marcas
    const productBrands = productsByCategory.data.map(product => product.brand_id)
    const uniqueBrands =
      params.id != 0 ? productBrands.filter((brand, index) => productBrands.indexOf(brand) === index) : []
    const brands = await BigcommerceService.getBrands(uniqueBrands, brand)

    let arrayFilters = { categories: [categories], brands: brands }

    return arrayFilters
  }

  public async bannerCategory({ params }: HttpContextContract) {
    const id = params.parent == 0 ? params.id : params.parent
    const category = params.id != 0 ? await BigcommerceService.getCategory(id) : 0
    let name_seoByCategory =
      params.id != 0 ? await BigcommerceService.getMetafieldsByCategory(id, 'category_name_seo') : []

    let principal_banner =
      params.id != 0 ? await BigcommerceService.getMetafieldsByCategory(id, 'categories_banner') : []
    let name = category.name
    if (id == 1037 || id == 1036 || id == 1039) {
      name = ''
    }
    principal_banner = {
      name: name,
      name_seo: name_seoByCategory,
      banner: principal_banner,
      page_title: category.page_title,
      meta_description: category.meta_description,
      meta_keywords: category.meta_keywords,
      description: category.description
    }
    return principal_banner
  }

  public async filterCategory({ params }: HttpContextContract) {
    const id = params.parent == 0 ? params.id : params.parent

    // Obtener todas las categorías principales
    let categories = await BigcommerceService.getCategoriesByParentFilter(id, 0)
    // Obtener los beneficios
    let benefits = await BigcommerceService.getCategoriesByParentFilter(0, 0, 'Beneficios', Env.get('ID_BENEFITS'))

    let subcategories = await BigcommerceService.getCategoriesByParentFilter(0, 0, 'Subcategorias', '')

    let childrens_subcategories = await BigcommerceService.getCategoriesByParentFilter(id, 1, '')

    // Obtener id de los filtros
    let new_categories =
      categories.data.length > 0
        ? await BigcommerceService.getCategoriesByParent(categories.data[0].category_id, 0)
        : []

    if (new_categories.length == 0) {
      // Si no hay nuevas categorías, concatenar beneficios y subcategorías si existen
      categories = benefits
      if (subcategories.data && subcategories.data.length > 0) {
        categories.data = categories.data.concat(subcategories.data)
      }
    } else {
      // Si hay nuevas categorías, concatenar tanto beneficios como subcategorías
      categories.data = new_categories.data
      if (benefits.data && benefits.data.length > 0) {
        categories.data = categories.data.concat(benefits.data)
      }
      if (subcategories.data && subcategories.data.length > 0) {
        categories.data = categories.data.concat(subcategories.data)
      }
    }

    // Ordenar los hijos por `sort_order` de manera descendente
    categories.data.sort((a, b) => a.sort_order - b.sort_order)

    // Obtener y agregar hijos para cada categoría principal
    const categoriesWithChildren = await Promise.all(
      categories.data.map(async category => {
        let visible = category.category_id == Env.get('ID_BENEFITS') ? 1 : 0
        const children = await BigcommerceService.getCategoriesByParent(category.category_id, visible)

        // Ordenar los hijos por `sort_order` de manera descendente
        children.data.sort((a, b) => a.sort_order - b.sort_order)

        // Obtener y agregar nietos para cada hijo
        category.title = category.name

        // Si no es "Beneficios", simplemente asignar los children sin filtrar
        category.childrens = await Promise.all(
          children.data.map(async child => {
            const grandchildren = await BigcommerceService.getCategoriesByParent(child.category_id, visible)

            // Ordenar los nietos por `sort_order` de manera descendente
            grandchildren.data.sort((a, b) => a.sort_order - b.sort_order)

            child.childrens = grandchildren.data
            child.title = child.name
            return child
          })
        )

        return category
      })
    )

    console.log('childrens_subcategories antes del map:', childrens_subcategories)
    const filteredCategories = categoriesWithChildren.map(category => {
      if (category.name === 'Beneficios') {
        // Filtrar los childrens de la categoría "Beneficios"
        category.childrens = category.childrens.filter(child => child.is_visible)
      }
      if (category.name === 'Subcategorías') {
        category.childrens = childrens_subcategories.data || []
      }
      return category
    })

    return filteredCategories
  }

  public async globalFilters({ params }: HttpContextContract) {
    let categories = await BigcommerceService.getNewFilters(Env.get('ID_NEW_FILTERS'), 0)

    // Obtener los beneficios
    let benefits = await BigcommerceService.getCategoriesByParentFilter(0, 0, 'Beneficios', Env.get('ID_BENEFITS'))
      // Si hay nuevas categorías, concatenar tanto beneficios como subcategorías
      categories.data = categories.data
      if (benefits.data && benefits.data.length > 0) {
        categories.data = categories.data.concat(benefits.data)
      }
    

    // Ordenar los hijos por `sort_order` de manera descendente
    categories.data.sort((a, b) => a.sort_order - b.sort_order)

    // Obtener y agregar hijos para cada categoría principal
    const categoriesWithChildren = await Promise.all(
      categories.data.map(async category => {
        let visible = category.category_id == Env.get('ID_BENEFITS') ? 1 : 0
        const children = await BigcommerceService.getCategoriesByParent(category.category_id, visible)

        // Ordenar los hijos por `sort_order` de manera descendente
        children.data.sort((a, b) => a.sort_order - b.sort_order)

        // Obtener y agregar nietos para cada hijo
        category.title = category.name

        // Si no es "Beneficios", simplemente asignar los children sin filtrar
        category.childrens = await Promise.all(
          children.data.map(async child => {
            const grandchildren = await BigcommerceService.getCategoriesByParent(child.category_id, visible)

            // Ordenar los nietos por `sort_order` de manera descendente
            grandchildren.data.sort((a, b) => a.sort_order - b.sort_order)

            child.childrens = grandchildren.data
            child.title = child.name
            return child
          })
        )

        return category
      })
    )

    const filteredCategories = categoriesWithChildren.map(category => {
      if (category.name === 'Beneficios') {
        // Filtrar los childrens de la categoría "Beneficios"
        category.childrens = category.childrens.filter(child => child.is_visible)
      }
      return category
    })

    return filteredCategories
  }

  public async syncCategoriesFromBigcommerce() {
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
