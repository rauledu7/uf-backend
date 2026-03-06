import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Department from './Department'
import ShippingType from './ShippingType'

export default class CityFulppi extends BaseModel {
  public static table = 'cities_fulppi'

  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public department_id: number

  @column()
  public type_id: number

  @column()
  public weight5to30kg: number

  @column()
  public weightover30kg: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Department, {
    foreignKey: 'department_id'
  })
  public department: BelongsTo<typeof Department>

  @belongsTo(() => ShippingType, {
    foreignKey: 'type_id'
  })
  public shipping_type: BelongsTo<typeof ShippingType>
}
