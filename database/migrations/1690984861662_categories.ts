import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'categories'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('category_id').primary().notNullable() // Usar category_id como clave primaria
      table.string('title').notNullable()
      table.string('url').notNullable()
      table.integer('parent_id').notNullable()
      table.integer('order').notNullable()
      table.string('image').nullable()
      table.boolean('is_visible').defaultTo(false)
      table.integer('tree_id').notNullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
