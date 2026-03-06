import Category from 'App/Models/Category'
import Env from '@ioc:Adonis/Core/Env'
import Filter from 'App/Models/Filter'

export default class SyncFiltersService {
  public async syncFiltersFromBigcommerce() {
    try {
      //TODO: Obtener todas las categorías del árbol especificado
      const categories = await Category.query().where('tree_id', Env.get('BIGCOMMERCE_TREE_ID'))

      //TODO:  Obtener las categorías principales
      const parentCategories = categories.filter(category => category.parent_id === 0)

      //TODO:  Recorrer las categorías principales y obtener sus hijos
      const categoriesWithChildren = await Promise.all(
        parentCategories.map(async category => {
          return await this.getCategoryWithChildren(category, categories)
        })
      )
      let filters = this.filterCategoriesWithFilterTitle(categoriesWithChildren)

      filters = filters
        .map(category => {
          const getFilter = category.children
            .filter(elem => elem.title.toLowerCase() === 'filtros')
            .map(elem => ({
              category_id: elem.category_id,
              name: elem.title,
              parent_id: elem.parent_id
            }))
          return getFilter
        })
        .flat()

      const saveFilterInDb = Filter.updateOrCreateMany('category_id', filters)
      return saveFilterInDb
    } catch (error) {
      throw error
    }
  }

  private async getCategoryWithChildren(parentCategory: Category, allCategories: Category[]): Promise<any> {
    //TODO: Obtener los hijos de la categoría actual
    const children = allCategories.filter(category => category.parent_id === parentCategory.category_id)

    //TODO: Recursivamente obtener los hijos de los hijos
    const childrenWithChildren = await Promise.all(
      children.map(async child => {
        return await this.getCategoryWithChildren(child, allCategories)
      })
    )

    //TODO: Devolver la categoría con sus hijos
    return {
      ...parentCategory.toJSON(),
      children: childrenWithChildren
    }
  }

  public searchParentCategory(category: Category[], parent_id: number) {
    let parentCategory = category.find(cat => cat.category_id === parent_id)
    return parentCategory
  }

  //TODO: Nueva función para filtrar categorías con hijos que tienen el título "Filtros" o "filtros"
  public filterCategoriesWithFilterTitle(categories: any[]): any[] {
    const filteredCategories = categories.filter(category => {
      return this.hasChildWithFilterTitle(category)
    })
    return filteredCategories
  }

  //TODO: Para verificar si una categoría o alguno de sus hijos tiene el título "Filtros" o "filtros"
  private hasChildWithFilterTitle(category: any): boolean {
    if (!category.children || category.children.length === 0) {
      return false
    }

    for (let child of category.children) {
      if (child.title.toLowerCase() === 'filtros' || this.hasChildWithFilterTitle(child)) {
        return true
      }
    }

    return false
  }
}
