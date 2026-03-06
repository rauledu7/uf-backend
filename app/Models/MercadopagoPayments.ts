import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class MercadopagoPayments extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public order: string

  @column()
  public payment_id: string

  @column()
  public status: string

  @column()
  public method_payment: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
