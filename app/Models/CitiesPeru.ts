import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import DepartmentsPeru from './DepartmentsPeru'
import ShippingZonesPeru from './ShippingZonesPeru'

export default class CitiesPeru extends BaseModel {
  public static table = 'cities_peru'

  @column({ isPrimary: true })
  public id: number

  @column()
  public iata: string

  @column()
  public city: string

  @column()
  public ubigeo: string

  @column()
  public id_department: number

  @column()
  public id_shipping_zone: number

  @column()
  public traslate: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => DepartmentsPeru, {
    foreignKey: 'id_department'
  })
  public department: BelongsTo<typeof DepartmentsPeru>

  @belongsTo(() => ShippingZonesPeru, {
    foreignKey: 'id_shipping_zone'
  })
  public shipping_zone: BelongsTo<typeof ShippingZonesPeru>
}
