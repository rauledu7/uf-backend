import {DateTime} from 'luxon'
import {BaseModel, BelongsTo, belongsTo, column} from '@ioc:Adonis/Lucid/Orm'
import ProductsBigcommerce from './ProductsBigcommerce'
import Categories from './Category'

export default class CategoryProduct extends BaseModel {
  // ✅ ID auto-incremental como PRIMARY KEY
  @column({isPrimary: true})
  public id: number

  // ✅ category_id con referencia a categories
  @column()
  public category_id: number

  // ✅ product_id con referencia a products_bigcommerce
  @column()
  public product_id: number

  // ✅ Timestamps estándar
  @column.dateTime({autoCreate: true})
  public createdAt: DateTime

  @column.dateTime({autoCreate: true, autoUpdate: true})
  public updatedAt: DateTime

  // ✅ Relación con ProductsBigcommerce
  @belongsTo(() => ProductsBigcommerce, {
    foreignKey: 'product_id',
  })
  public product: BelongsTo<typeof ProductsBigcommerce>

  // ✅ Relación con Categories
  @belongsTo(() => Categories, {
    foreignKey: 'category_id',
  })
  public category: BelongsTo<typeof Categories>

  // ✅ Métodos de búsqueda optimizados
  public static async findByProductId (productId: number) {
    return this.query()
      .where('product_id', productId)
      .preload('category')
      .orderBy('category_id', 'asc')
  }

  public static async findByCategoryId (categoryId: number) {
    return this.query()
      .where('category_id', categoryId)
      .preload('product')
      .orderBy('product_id', 'asc')
  }

  public static async findByProductIdAndCategoryId (productId: number, categoryId: number) {
    return this.query()
      .where('product_id', productId)
      .where('category_id', categoryId)
      .first()
  }

  // ✅ Método para obtener todas las categorías de un producto
  public static async getCategoriesByProduct (productId: number) {
    const relations = await this.query()
      .where('product_id', productId)
      .preload('category')
      .orderBy('category_id', 'asc')

    return relations.map(relation => relation.category)
  }

  // ✅ Método para obtener todos los productos de una categoría
  public static async getProductsByCategory (categoryId: number) {
    const relations = await this.query()
      .where('category_id', categoryId)
      .preload('product')
      .orderBy('product_id', 'asc')

    return relations.map(relation => relation.product)
  }

  // ✅ Método para verificar si existe una relación
  public static async relationExists (productId: number, categoryId: number): Promise<boolean> {
    const relation = await this.query()
      .where('product_id', productId)
      .where('category_id', categoryId)
      .first()

    return !!relation
  }

  // ✅ Método para crear múltiples relaciones
  public static async createMultipleRelations (relations: Array<{product_id: number, category_id: number}>) {
    const validRelations: Array<{product_id: number, category_id: number}> = []

    for (const relation of relations) {
      const exists = await this.relationExists(relation.product_id, relation.category_id)
      if (!exists) {
        validRelations.push(relation)
      }
    }

    if (validRelations.length > 0) {
      return await this.createMany(validRelations)
    }

    return []
  }
}
