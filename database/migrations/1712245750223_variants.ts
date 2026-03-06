// database/migrations/timestamp_create_variants.ts
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class CreateVariants extends BaseSchema {
  protected tableName = 'variants'

  public async up() {
    this.schema.createTable(this.tableName, table => {
      table.integer('id').primary()
      table.integer('product_id').unsigned()
      table.string('title').notNullable()
      table.string('sku').notNullable()
      table.float('normal_price').notNullable()
      table.float('discount_price').notNullable()
      table.float('cash_price').notNullable()
      table.string('discount_rate').notNullable()
      table.integer('stock').notNullable()
      table.integer('warning_stock').notNullable()
      table.string('image').notNullable()
      table.specificType('images', 'text[]').notNullable()
      table.integer('quantity').notNullable()
      table.float('armed_cost').notNullable()
      table.integer('armed_quantity').notNullable()
      table.float('weight').notNullable()
      table.float('height').nullable()
      table.float('width').nullable()
      table.float('depth').nullable()
      table.string('type').nullable()
      table.specificType('options', 'jsonb').nullable().defaultTo('[]')
      table.specificType('related_products', 'jsonb').nullable().defaultTo('[]')
      table.timestamps(true, true)
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
