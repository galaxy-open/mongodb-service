import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'database_deployments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Standard Lucid primary key
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .unique()
        .notNullable()

      // Foreign key to database_instances
      table
        .uuid('database_instance_id')
        .references('id')
        .inTable('database_instances')
        .onDelete('CASCADE')
        .notNullable()

      table.text('docker_compose_content').nullable()
      table.text('exporter_compose_content').nullable()

      table.timestamp('backup_datetime')
      table.boolean('backup_enabled').defaultTo(true).notNullable()
      table.timestamp('last_backup_at').nullable()

      // Deployment duration tracking
      table.timestamp('deployment_started_at').nullable()
      table.integer('deployment_duration_ms').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
