import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class DepartmentsPeru extends BaseModel {
  public static table = 'departments_peru'

  @column({ isPrimary: true })
  public id: number

  @column()
  public department: string

  @column()
  public iata: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
