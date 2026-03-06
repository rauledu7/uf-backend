import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import ShippingZonesPeru from './ShippingZonesPeru'
import WeightList from './WeightList'

export default class UrbanoPrice extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public price: number

  @column()
  public id_shipping_zone: number

  @column()
  public id_weight_list: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => ShippingZonesPeru, {
    foreignKey: 'id_shipping_zone'
  })
  public shipping_zone: BelongsTo<typeof ShippingZonesPeru>

  @belongsTo(() => WeightList, {
    foreignKey: 'id_weight_list'
  })
  public weight: BelongsTo<typeof WeightList>
}
