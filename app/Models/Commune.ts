import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Region from './Region'

export default class Commune extends BaseModel {
  public static table = 'communes'

  @column({ isPrimary: true })
  public id: number

  @column()
  public commune: string

  @column()
  public region_id: number

  @column()
  public traslate: string

  @column()
  public zona: number

  @column()
  public is_fedex: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Region, {
    foreignKey: 'region_id'
  })
  public region: BelongsTo<typeof Region>
}
