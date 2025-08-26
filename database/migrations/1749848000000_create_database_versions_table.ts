import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'database_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('version', 100).primary().notNullable() // → DatabaseVersions enum - business key as PK
      table.string('display_name', 100).notNullable() // 'MongoDB 7.0.4'
      table.string('database_engine', 100).notNullable() // → DatabaseEngines enum
      table.boolean('is_active').defaultTo(true).notNullable()
      table.boolean('is_visible').defaultTo(true).notNullable() // Whether to show in UI listings
      table.date('end_of_life').nullable() // When support ends

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
