import { DateTime } from 'luxon'
import { BaseModel, HasMany, column, hasMany } from '@ioc:Adonis/Lucid/Orm'
import ProductsBigcommerce from './ProductsBigcommerce'

export default class Brand extends BaseModel {
  @column()
  public id: number

  @column({ isPrimary: true })
  public brand_id: number

  @column()
  public name: string

  @hasMany(() => ProductsBigcommerce, {
    foreignKey: 'brand_id'
  })
  public products: HasMany<typeof ProductsBigcommerce>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
