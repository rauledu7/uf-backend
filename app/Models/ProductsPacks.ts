import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import ProductsBigcommerce from './ProductsBigcommerce'

export default class ProductsPacks extends BaseModel {
  public static table = 'products_packs'

  @column({ isPrimary: true })
  public table_id: number

  @column()
  public pack_id: number

  @column()
  public product_id: number

  @column()
  public sku: string

  @column()
  public stock: number

  @column()
  public quantity: number

  @column()
  public is_variant: boolean

  @column()
  public variant_id: number // este valor representa el id de la variante de los packs de variantes

  @belongsTo(() => ProductsBigcommerce, {
    foreignKey: 'product_id'
  })
  public product: BelongsTo<typeof ProductsBigcommerce>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
