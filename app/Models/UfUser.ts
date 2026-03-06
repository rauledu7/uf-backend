import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class UfUser extends BaseModel {
  public static table = 'uf_users'

  @column({ isPrimary: true })
  public id: number

  @column()
  public user_login: string

  @column()
  public user_email: string

  @column()
  public user_pass: string

  @column()
  public user_nicename: string

  @column()
  public display_name: string

  @column()
  public firstname: string

  @column()
  public lastname: string

  @column()
  public user_role: string

  @column()
  public registered: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
