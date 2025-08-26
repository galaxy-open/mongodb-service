import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'database_connections'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)

      table
        .uuid('database_instance_id')
        .notNullable()
        .references('id')
        .inTable('database_instances')
        .onDelete('CASCADE')

      table.string('region_code', 100).references('code').inTable('regions').notNullable() // → RegionCodes enum

      table.integer('port').nullable()
      table.string('hostname_uri', 500).nullable()
      table.string('admin_uri', 1000).nullable()
      table.string('backup_uri', 1000).nullable()
      table.string('monitor_uri', 1000).nullable()
      table.string('tls_mode', 10).defaultTo('off').notNullable()

      table.string('admin_password', 255).nullable()
      table.string('backup_password', 255).nullable()
      table.string('monitor_password', 255).nullable()
      table.string('replica_key', 255).nullable()

      table.unique(['port', 'region_code']) // Port unique per region

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
