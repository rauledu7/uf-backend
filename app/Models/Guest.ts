import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Guest extends BaseModel {
  protected tableName = 'guests'

  @column({ isPrimary: true })
  public id: number

  @column()
  public customer_id: number

  @column()
  public email: string

  @column()
  public cart_id: string

  @column()
  public recover: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
