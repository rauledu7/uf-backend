import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Thiago extends BaseModel {
  public static table = 'weight_thiago'
  @column({ isPrimary: true })
  public id: number

  @column()
  public min_weight: number

  @column()
  public max_weight: number | null

  @column()
  public value: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
