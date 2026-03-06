// app/Models/Variant.ts
import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import ProductsBigcommerce from './ProductsBigcommerce'

export default class Variant extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public product_id: number

  @column()
  public option_id: number

  @column()
  public title: string

  @column()
  public sku: string

  @column()
  public normal_price: number

  @column()
  public discount_price: number

  @column()
  public cash_price: number

  @column()
  public discount_rate: string

  @column()
  public stock: number

  @column()
  public warning_stock: number

  @column()
  public image: string

  @column()
  public images: string[]

  @column()
  public quantity: number

  @column()
  public armed_cost: number

  @column()
  public armed_quantity: number

  @column()
  public weight: number

  @column()
  public height: number

  @column()
  public depth: number

  @column()
  public width: number

  @column()
  public type: string

  @column()
  public value_id: number
  @column({ serializeAs: 'options' })
  public options: any[] | string

  @column({ serializeAs: 'related_products' })
  public related_products: number[] | null

  @belongsTo(() => ProductsBigcommerce, {
    foreignKey: 'product_id'
  })
  public product: BelongsTo<typeof ProductsBigcommerce>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
