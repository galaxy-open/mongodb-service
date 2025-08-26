import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'database_dns_records'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .unique()
        .notNullable()
      table.string('stack_name', 100).notNullable()
      table.string('record_name', 200).notNullable()
      table.string('record_type', 10).notNullable() // → DnsRecordTypes enum
      table.string('record_value', 200).notNullable()
      table.integer('ttl').defaultTo(5).notNullable()
      table
        .uuid('database_dns_zone_id')
        .references('id')
        .inTable('database_dns_zones')
        .notNullable()
      table.string('status', 100).defaultTo('pending').notNullable() // → DnsRecordStatus enum

      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index for common queries
      table.index(['stack_name'])
      table.index(['database_dns_zone_id'])
      table.index(['status'])
      table.index(['record_name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
