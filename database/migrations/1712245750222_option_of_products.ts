import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class OptionOfVariants extends BaseSchema {
  protected tableName = 'option_of_products'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      // ✅ ID auto-incremental como PRIMARY KEY
      table.increments('id').primary()

      // ✅ option_id puede repetirse para diferentes productos
      table.integer('option_id').notNullable()

      // ✅ label para el valor específico de la opción
      table.string('label').notNullable()

      // ✅ product_id con referencia a products_bigcommerce
      table.integer('product_id').unsigned().references('product_id').inTable('products_bigcommerce').onDelete('CASCADE')

      // ✅ options como JSONB para datos adicionales (corregido .nullable() duplicado)
      table.specificType('options', 'jsonb').nullable().defaultTo('[]')

      // ✅ Timestamps estándar
      table.timestamp('created_at', {useTz: true})
      table.timestamp('updated_at', {useTz: true})

      // ✅ CONSTRAINT ÚNICO CORRECTO: (option_id, product_id, label)
      // Esto evita duplicados de la misma opción para el mismo producto
      table.unique(['option_id', 'product_id', 'label'])

      // ✅ ÍNDICES PARA PERFORMANCE
      table.index(['product_id'])
      table.index(['option_id'])
      table.index(['label'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
