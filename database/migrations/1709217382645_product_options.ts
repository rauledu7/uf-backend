import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'product_options'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('product_id').unsigned().references('products_bigcommerce.product_id').onDelete('CASCADE').unique()
      table.integer('option_id').unsigned().references('options.category_id').onDelete('CASCADE').unique()

      // Otras columnas que puedas necesitar

      table.timestamps(true, true)
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
