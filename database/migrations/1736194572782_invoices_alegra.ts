import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'invoices_alegra'

  public async up() {
    this.schema.createTable(this.tableName, table => {
      table.string('invoice_id').primary()
      table.integer('order_id').notNullable()
      table.string('client_id').notNullable()
      table.string('template').notNullable()
      table.string('list').notNullable()
      table.string('amount').notNullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
