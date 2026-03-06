import { DateTime } from 'luxon'
import { BaseModel, column, BelongsTo, belongsTo, HasMany, hasMany } from '@ioc:Adonis/Lucid/Orm'
import Filter from 'App/Models/Filter'
import ProductOption from './ProductOption'

export default class Option extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public category_id: number

  @column()
  public filter_id: number

  @belongsTo(() => Filter)
  public filter: BelongsTo<typeof Filter>

  @hasMany(() => ProductOption)
  public ProductOption: HasMany<typeof ProductOption>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
