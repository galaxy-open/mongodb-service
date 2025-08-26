import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trusted_identity_providers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .notNullable()

      table.string('name', 255).notNullable()
      table.string('slug', 255).notNullable().unique()
      table.string('expected_audience', 255).nullable()
      table.string('issuer_url', 255).notNullable()
      table.string('jwks_uri').notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()

      table.index('issuer_url')
      table.index('is_active')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
