import {DateTime} from 'luxon'
import {BaseModel, BelongsTo, belongsTo, column} from '@ioc:Adonis/Lucid/Orm'
import ProductsBigcommerce from './ProductsBigcommerce'

export default class OptionOfProducts extends BaseModel {
  // ✅ ID auto-incremental como PRIMARY KEY
  @column({isPrimary: true})
  public id: number

  // ✅ option_id puede repetirse para diferentes productos
  @column()
  public option_id: number

  // ✅ label para el valor específico de la opción
  @column()
  public label: string

  // ✅ product_id con referencia a products_bigcommerce
  @column()
  public product_id: number

  // ✅ options como JSONB para datos adicionales
  @column({serializeAs: 'options'})
  public options: any[] | string | null

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

  // ✅ Métodos de búsqueda optimizados
  public static async findByProductId (productId: number) {
    return this.query()
      .where('product_id', productId)
      .orderBy('option_id', 'asc')
      .orderBy('label', 'asc')
  }

  public static async findByProductIdAndOptionId (productId: number, optionId: number) {
    return this.query()
      .where('product_id', productId)
      .where('option_id', optionId)
  }

  public static async findByProductIdAndLabel (productId: number, label: string) {
    return this.query()
      .where('product_id', productId)
      .where('label', label)
  }

  // ✅ Método para obtener opciones agrupadas por tipo
  public static async getOptionsGroupedByType (productId: number) {
    const options = await this.query()
      .where('product_id', productId)
      .orderBy('option_id', 'asc')
      .orderBy('label', 'asc')

    // Agrupar por option_id
    const grouped = options.reduce((acc, option) => {
      if (!acc[option.option_id]) {
        acc[option.option_id] = {
          option_id: option.option_id,
          label: option.label,
          values: [],
        }
      }
      acc[option.option_id].values.push({
        label: option.label,
        options: option.options,
      })
      return acc
    }, {})

    return Object.values(grouped)
  }
}
