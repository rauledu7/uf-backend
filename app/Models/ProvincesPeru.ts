import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import DepartmentsPeru from './DepartmentsPeru'
export default class ProvincesPeru extends BaseModel {
  public static table = 'provinces_peru'

  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public id_department: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => DepartmentsPeru, {
    foreignKey: 'id_department'
  })
  public department: BelongsTo<typeof DepartmentsPeru>
}
