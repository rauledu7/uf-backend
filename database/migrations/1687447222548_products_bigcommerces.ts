import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'products_bigcommerce'

  public async up() {
    this.schema.createTable(this.tableName, table => {
      table.increments('id')
      table.integer('product_id').primary()
      table.string('image').notNullable()
      table.specificType('images', 'jsonb[]').nullable()
      table.string('hover').nullable()
      table.string('title').notNullable()
      table.string('page_title').nullable()
      table.text('description').notNullable()
      table.integer('brand_id').unsigned().references('brand_id').inTable('brands')
      table.specificType('categories_array', 'jsonb').notNullable()
      table.integer('stock').notNullable()
      table.integer('warning_stock').nullable()
      table.integer('normal_price').nullable()
      table.integer('discount_price').nullable()
      table.integer('cash_price').nullable()
      table.integer('timer_price').defaultTo(0)
      table.boolean('timer_status').defaultTo(false)
      table.timestamp('timer_datetime', { useTz: true }).nullable()
      table.string('percent').notNullable()
      table.string('url').notNullable()
      table.string('type').notNullable()
      table.integer('quantity').notNullable()
      table.float('armed_cost').notNullable()
      table.float('weight').notNullable()
      table.integer('sort_order').notNullable()
      table.string('reserve').nullable()
      table.jsonb('reviews').nullable()
      table.boolean('sameday').notNullable()
      table.boolean('free_shipping').notNullable()
      table.boolean('despacho24horas').notNullable()
      table.boolean('featured').notNullable()
      table.boolean('pickup_in_store').notNullable()
      table.boolean('is_visible').notNullable()
      table.boolean('turbo').notNullable()
      table.specificType('meta_keywords', 'text[]').nullable()
      table.string('meta_description').nullable().defaultTo(null)
      table.specificType('sizes', 'jsonb').nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
