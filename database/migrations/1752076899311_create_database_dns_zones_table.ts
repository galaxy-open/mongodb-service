import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'database_dns_zones'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .unique()
        .notNullable()
      table.string('region_code', 100).references('code').inTable('regions').notNullable() // → RegionCodes enum
      table.string('database_engine', 100).notNullable() // → DatabaseEngines enum
      table.string('external_zone_identifier', 100).notNullable()
      table.string('domain_name', 200).notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Unique constraint: one zone per region/engine combination
      table.unique(['region_code', 'database_engine'])

      // Index for common queries
      table.index(['region_code', 'database_engine', 'is_active'])
      table.index(['external_zone_identifier'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
