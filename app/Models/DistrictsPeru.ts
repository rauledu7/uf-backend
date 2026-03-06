import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import ProvincesPeru from './ProvincesPeru'
import DepartmentsPeru from './DepartmentsPeru'
import ShippingZonesPeru from './ShippingZonesPeru'

export default class DistrictsPeru extends BaseModel {
  public static table = 'districts_peru'

  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public ubigeo: string

  @column()
  public id_province: number

  @column()
  public id_department: number

  @column()
  public id_shipping_zone: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => ProvincesPeru, {
    foreignKey: 'id_province'
  })
  public province: BelongsTo<typeof ProvincesPeru>

  @belongsTo(() => DepartmentsPeru, {
    foreignKey: 'id_department'
  })
  public department: BelongsTo<typeof DepartmentsPeru>

  @belongsTo(() => ShippingZonesPeru, {
    foreignKey: 'id_shipping_zone'
  })
  public shipping_zone: BelongsTo<typeof ShippingZonesPeru>
}
