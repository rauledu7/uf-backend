import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'category_products'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      // ✅ ID auto-incremental como PRIMARY KEY
      table.increments('id').primary()

      // ✅ category_id con referencia a categories
      table.integer('category_id').unsigned().references('category_id').inTable('categories').onDelete('CASCADE')

      // ✅ product_id con referencia a products_bigcommerce
      table.integer('product_id').unsigned().references('product_id').inTable('products_bigcommerce').onDelete('CASCADE')

      // ✅ Timestamps estándar
      table.timestamp('created_at', {useTz: true})
      table.timestamp('updated_at', {useTz: true})

      // ✅ CONSTRAINT ÚNICO: (product_id, category_id)
      // Esto evita duplicados de la misma relación
      table.unique(['product_id', 'category_id'])

      // ✅ ÍNDICES PARA PERFORMANCE
      table.index(['product_id'])
      table.index(['category_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
