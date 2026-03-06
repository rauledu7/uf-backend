import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class AbandonedCart extends BaseModel {
  protected tableName = 'abandoned_cart'

  @column({ isPrimary: true })
  public id: string

  @column()
  public email: String

  @column({ serializeAs: 'products' })
  public products: Number[]

  @column()
  public num_emails_send: Number

  @column()
  public complete: Boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
