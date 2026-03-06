import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class InvoicesAlegra extends BaseModel {
  public static table = 'invoices_alegra'

  @column({ isPrimary: true })
  public invoice_id: string

  @column()
  public order_id: number

  @column()
  public client_id: string

  @column()
  public template: string

  @column()
  public list: string
  @column()
  public amount: string
  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
