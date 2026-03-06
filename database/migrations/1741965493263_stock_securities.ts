import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'stock_securities'

  public async up() {
    this.schema.createTable(this.tableName, table => {
      table.string('sku').primary()
      table.string('name')
      table.integer('stock_security')
      table.boolean('email_sended')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
