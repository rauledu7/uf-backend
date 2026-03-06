import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'districts_peru'

  public async up() {
    this.schema.createTable(this.tableName, table => {
      table.increments('id').primary()
      table.string('name')
      table.string('ubigeo')
      table.integer('id_department').unsigned().references('id').inTable('departments_peru').onDelete('CASCADE')
      table.integer('id_province').unsigned().references('id').inTable('provinces_peru').onDelete('CASCADE')
      table.integer('id_shipping_zone').unsigned().references('id').inTable('shipping_zones_peru').onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
