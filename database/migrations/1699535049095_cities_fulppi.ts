import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'cities_fulppi'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name', 255).notNullable()
      table.integer('department_id').unsigned().references('id').inTable('departments').onDelete('CASCADE')
      table.integer('type_id').unsigned().references('id').inTable('shipping_types').onDelete('CASCADE')
      table.integer('weight5to30kg').notNullable()
      table.integer('weightover30kg').notNullable()
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
