import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class WeightList extends BaseModel {
  public static table = 'weight_list'
  @column({ isPrimary: true })
  public id: number

  @column()
  public min: number

  @column()
  public max: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
