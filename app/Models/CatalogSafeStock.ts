import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class CatalogSafeStock extends BaseModel {
  protected tableName = 'catalog_safe_stock'

  @column({ isPrimary: true })
  public id: number

  @column()
  public product_id: number

  @column()
  public sku: string

  @column()
  public variant_id: number

  @column()
  public safety_stock: number

  @column()
  public warning_level: number

  @column()
  public available_to_sell: number

  @column()
  public bin_picking_number: string | null | undefined

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
