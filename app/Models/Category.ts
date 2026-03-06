import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, HasMany, belongsTo, column, hasMany } from '@ioc:Adonis/Lucid/Orm'
import CategoryProduct from './CategoryProduct'

export default class Category extends BaseModel {
  protected tableName = 'categories'

  @column()
  public id: number

  @column({ isPrimary: true })
  public category_id: number

  @column()
  public title: string

  @column()
  public url: string

  @column()
  public parent_id: number

  @column()
  public order: number

  @column()
  public image: string | null

  @column()
  public is_visible: boolean

  @column()
  public tree_id: boolean

  @hasMany(() => CategoryProduct) // Relación hasMany con CategoryProduct
  public products: HasMany<typeof CategoryProduct>

  @hasMany(() => Category, {
    foreignKey: 'parent_id',
    localKey: 'category_id'
  })
  public children: HasMany<typeof Category>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
