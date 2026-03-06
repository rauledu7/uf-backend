import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, HasMany, belongsTo, column, hasMany } from '@ioc:Adonis/Lucid/Orm'
import Brand from './Brand'
import CategoryProduct from './CategoryProduct'

export default class ProductsBigcommerce extends BaseModel {
  public static table = 'products_bigcommerce' // Asegúrate de que este nombre es correcto

  @column()
  public id: number

  @column({ isPrimary: true })
  public product_id: number

  @column()
  public image: string

  @column()
  public images: any[] | null

  @column()
  public hover: string | null

  @column()
  public title: string

  @column()
  public page_title: string

  @column()
  public description: string

  @column()
  public brand_id: number | null

  @column({ serializeAs: 'categories_array' })
  public categories_array: string[]

  @column()
  public stock: number

  @column()
  public warning_stock: number

  @column()
  public discount_price: number | null

  @column()
  public normal_price: number

  @column()
  public cash_price: number

  @column()
  public percent: string | null

  @column()
  public url: string

  @column()
  public type: string

  @column()
  public quantity: number

  @column()
  public armed_cost: number

  @column()
  public weight: number

  @column()
  public sort_order: number

  @column()
  public reserve: string | null

  @column()
  public reviews: {} | null

  @column()
  public sameday: boolean

  @column()
  public free_shipping: boolean

  @column()
  public despacho24horas: boolean

  @column()
  public featured: boolean

  @column()
  public pickup_in_store: boolean

  @column()
  public is_visible: boolean

  @column()
  public turbo: boolean

  @column()
  public meta_description: string

  @column()
  public meta_keywords: string[]

  @column({ serializeAs: 'sizes' })
  public sizes: string[] | null

  @belongsTo(() => Brand, {
    foreignKey: 'brand_id'
  })
  public brand: BelongsTo<typeof Brand>

  @hasMany(() => CategoryProduct, {
    foreignKey: 'product_id'
  })
  public categories: HasMany<typeof CategoryProduct>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column()
  public timer_price: number
  @column()
  public timer_datetime: DateTime
  @column()
  public timer_status: boolean
}
