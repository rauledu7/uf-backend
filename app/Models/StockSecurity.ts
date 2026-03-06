import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class StockSecurity extends BaseModel {
  protected tableName = 'stock_securities'

  @column({ isPrimary: true })
  public sku: string

  @column()
  public name: string

  @column()
  public stock_security: number

  @column()
  public email_sended: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
