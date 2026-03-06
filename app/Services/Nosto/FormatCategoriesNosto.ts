import Category from 'App/Models/Category'

//TODO: Esta clase se encarga de generar el formato de array de categorias para catalog de productos de nosto
export default class FormatCategoriesNosto {
  public async formatCategories(category: number[]): Promise<string[] | undefined> {
    try {
      if (category == undefined) {
        throw new Error('array categories must be specified or create instance of class FormatCategoriesNosto')
      }

      let getCategories = await Category.query()
        .whereIn('category_id', category)
        .select('title', 'category_id', 'parent_id', 'is_visible', 'url')

      if (!getCategories) {
        throw new Error('Categories were not found in the database')
      }

      let categoriesVisible = getCategories.filter(
        cat => (cat.is_visible || cat.url.toLowerCase().includes('filtros')) && category.includes(cat.category_id)
      )

      if (!categoriesVisible.length) return []

      // Función para encontrar una categoría por su ID dentro de categoriesVisible
      const findCategoryById = (id: number) => {
        return categoriesVisible.find(cat => cat.category_id === id)
      }

      const categoryPaths = categoriesVisible.map(cat => {
        let path = cat.title
        let currentCategory = cat

        // Bucle para construir la ruta completa de la categoría
        while (currentCategory.parent_id !== 0) {
          const parentCategory = findCategoryById(currentCategory.parent_id)

          // Verifica si la categoría padre existe
          if (!parentCategory) {
            break
          }

          currentCategory = parentCategory
          path = `${currentCategory.title}/${path}`
        }

        return path
      })

      return categoryPaths.filter(path => path !== undefined)
      // result ejemplo= [ "basquetbol",  "otros-juegos/camas-elasticas"]
    } catch (error) {
      console.error(error)
    }
  }
}
