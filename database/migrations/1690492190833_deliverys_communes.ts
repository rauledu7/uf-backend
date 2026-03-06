import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'deliverys_communes'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('commune').notNullable()
      table.integer('lead_time').notNullable()
      table.integer('delivery_time').notNullable()
      table.integer('extra_days').notNullable()
      table.boolean('express_lead_times').notNullable()
      table.boolean('express_delivery_times').notNullable()
      table.boolean('turbo').defaultTo(false)
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
