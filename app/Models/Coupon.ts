import { DateTime } from 'luxon'
import { column, BaseModel } from '@ioc:Adonis/Lucid/Orm'

export default class Coupon extends BaseModel {
  public static table = 'coupons'

  @column({ isPrimary: true })
  public id: number

  @column()
  public id_coupon: number

  @column()
  public name: string

  @column()
  public code: string

  @column()
  public num_uses: number

  @column()
  public email: string

  @column()
  public send_email: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
