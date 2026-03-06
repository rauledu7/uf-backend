import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class DeliverysCommune extends BaseModel {
  public static table = 'deliverys_communes'

  @column({ isPrimary: true })
  public id: number

  @column()
  public commune: string

  @column()
  public lead_time: number

  @column()
  public delivery_time: number

  @column()
  public express_lead_times: boolean

  @column()
  public express_delivery_times: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column()
  public extra_days: number
}
