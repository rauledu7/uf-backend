import { DateTime } from 'luxon'
import { BaseModel, column, BelongsTo, belongsTo } from '@ioc:Adonis/Lucid/Orm'
import Product from 'App/Models/Product'
import Option from 'App/Models/Option'

export default class ProductOption extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public product_id: number

  @column()
  public option_id: number

  @belongsTo(() => Product)
  public product: BelongsTo<typeof Product>

  @belongsTo(() => Option)
  public option: BelongsTo<typeof Option>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
