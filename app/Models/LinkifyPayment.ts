import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class LinkifyPayment extends BaseModel {
  public static table = 'linkify_payments'
  @column({ isPrimary: true })
  public id: string

  @column()
  public order_id: string

  @column()
  public uuid_linkify: string

  @column()
  public status: string | null

  @column()
  public amount: number | null

  @column()
  public rut: string | null

  @column()
  public email: string | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
