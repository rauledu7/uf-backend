import Category from 'App/Models/Category'
import CategoryProduct from 'App/Models/CategoryProduct'
import ProductsBigcommerce from 'App/Models/ProductsBigcommerce'
import Env from '@ioc:Adonis/Core/Env'

class ProductService {
  static async getProducts(params) {
    const categories = params.cat_id.split(',').map(Number)
    const brand_id = Number(params.brand_id)
    const page = Number(params.page)
    const limit = 8
    const order = params.order == 'default' ? 'asc' : params.order
    const sort = params.order == 'default' ? 'sort_order' : 'discount_price'
    const query = ProductsBigcommerce.query()
      .whereRaw('jsonb_array_length(categories) > 0')
      .whereRaw(`(categories::jsonb @> '${JSON.stringify(categories)}'::jsonb)`)

    if (brand_id) {
      query.where('brand_id', brand_id)
    }

    const orderCondition = `CASE WHEN stock > 0 THEN 0 ELSE 1 END`

    // Ordena los productos por stock (stock > 0 primero, stock = 0 después)
    query.orderByRaw(`${orderCondition} ASC, ${orderCondition} ${order.toUpperCase()}`)

    // Ordena por la columna de ordenación secundaria (sort) y la dirección de orden (order)
    query.orderBy(sort, order)

    // Realiza la paginación en los resultados ordenados
    const products = await query.paginate(page, limit)

    const meta = products.toJSON()
    const pagination = products.getMeta()

    return {
      products: meta,
      pagination: pagination
    }
  }
  //NUEVO 👀 👀
  static async getCampaignsByCategory(product, categories) {
    try {
      let productCategories: any = await CategoryProduct.query()
        .where('product_id', product)
        .whereIn('category_id', categories)
        .preload('category', query => {
          query.select(['title', 'url', 'category_id']) // Selecciona solo los campos necesarios de CategoriesNew
        })
      productCategories = productCategories.map(item => item.category.title)
      return productCategories
    } catch (error) {
      console.error('Error al obtener campañas por categorías:', error)
    }
  }

  //NUEVO 👀 👀
  static async getChildCategories(category_id: number) {
    try {
      let childCategoryIds: any = await Category.query().where('parent_id', category_id).select('category_id')
      childCategoryIds = childCategoryIds.map(category => category.category_id)
      return childCategoryIds
    } catch (error) {
      console.error('Error al obtener categorias hijas:', error)
    }
  }

  static async getDateReserve() {
    const childs_categories = await Category.query()
      .select('category_id', 'title')
      .where('parent_id', Env.get('ID_RESERVE'))
      .pojo()

    return childs_categories
  }

  static async getMenu() {
    const categories = await Category.query()
      .where('is_visible', true)
      .andWhere('parent_id', Env.get('PARENT_CATEGORY'))
      .orderBy('order', 'asc')

    // Función recursiva para cargar las categorías y sus hijos
    const loadChildren = async parentCategory => {
      // Cargar los hijos de una categoría
      await parentCategory.load('children', query => {
        query.orderBy('order', 'asc')
      })

      // Filtrar hijos visibles
      const visibleChildren = parentCategory.children.filter(child => child.is_visible)

      // Mapeo de hijos para incluir sus propios hijos de forma recursiva
      const formattedChildren = await Promise.all(
        visibleChildren.map(async child => {
          const grandchildren = await loadChildren(child) // Llamada recursiva para los nietos

          return {
            id: child.category_id,
            title: child.title,
            url: child.url.replace(Env.get('URL_STRUCTURE_CATEGORY'), ''),
            parent_id: child.parent_id,
            childrens: grandchildren, // Nietos son los hijos de este nivel
            order: child.order,
            image: child.image
          }
        })
      )

      return formattedChildren
    }

    // Cargar el menú de primer nivel
    const menu = await Promise.all(
      categories.map(async category => {
        const children = await loadChildren(category) // Cargar los hijos y nietos de cada categoría del primer nivel

        return {
          id: category.category_id,
          title: category.title,
          url: category.url.replace(Env.get('URL_STRUCTURE_CATEGORY'), ''),
          parent_id: category.parent_id,
          childrens: children, // Hijos y nietos
          order: category.order,
          image: category.image
        }
      })
    )

    return menu
  }
}
export default ProductService
