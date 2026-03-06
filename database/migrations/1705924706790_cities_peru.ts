
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'cities_peru'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('iata')
      table.string('city')
      table.string('ubigeo')
      table.float('traslate')
      table.integer('id_department').unsigned().references('id').inTable('departments_peru').onDelete('CASCADE')
      table.integer('id_shipping_zone').unsigned().references('id').inTable('shipping_zones_peru').onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
