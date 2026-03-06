import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class ProductsPacks extends BaseSchema {
  protected tableName = 'products_packs'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('table_id').primary()
      table.integer('pack_id').notNullable()
      table.integer('product_id').notNullable()
      table.string('sku').notNullable()
      table.integer('stock').notNullable()
      table.integer('quantity').notNullable()
      table.boolean('is_variant').nullable().defaultTo(false)
      table.integer('variant_id').nullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
      // Foreign keys

    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
