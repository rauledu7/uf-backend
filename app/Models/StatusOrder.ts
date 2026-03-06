import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class StatusOrder extends BaseModel {
  protected tableName = 'status_orders'
  @column({ isPrimary: true })
  public id: number

  @column()
  public order: number

  @column()
  public shipping: string
  @column()
  public method: string

  @column()
  public delivered: boolean

  @column()
  public created_at: string

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
