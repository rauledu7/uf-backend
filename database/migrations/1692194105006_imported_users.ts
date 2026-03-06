import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'imported_users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id', { primaryKey: true })
      table.string('user_login')
      table.string('user_email')
      table.string('user_pass')
      table.string('user_nicename')
      table.string('display_name')
      table.string('firstname')
      table.string('lastname')
      table.string('user_role')
      table.boolean('registered')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
