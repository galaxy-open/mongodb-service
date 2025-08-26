import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'regions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('code', 100).primary().notNullable() // → RegionCodes enum - business key as PK
      table.string('name', 100).notNullable() // 'US East (Virginia)', 'OVH Europe West'
      table.string('display_name', 100).notNullable() // 'United States East', 'Europe West'

      table.string('provider', 100).notNullable() // → CloudProviders enum

      table.string('country_code', 2).notNullable() // 'US', 'FR', 'AU'
      table.string('timezone', 100).notNullable() // 'America/New_York', 'Europe/Paris'

      table.boolean('is_active').defaultTo(true).notNullable()
      table.integer('max_instances').defaultTo(1000).notNullable() // Per-region limits

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
