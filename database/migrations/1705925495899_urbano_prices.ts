
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'urbano_prices'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.float('price')
      table.integer('id_shipping_zone').unsigned().references('id').inTable('shipping_zones_peru').onDelete('CASCADE')
      table.integer('id_weight_list').unsigned().references('id').inTable('weight_list').onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
