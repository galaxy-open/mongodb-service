import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'database_backups'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .notNullable()

      table
        .uuid('database_instance_id')
        .references('id')
        .inTable('database_instances')
        .onDelete('CASCADE')
        .notNullable()

      table.string('backup_type', 100).notNullable() // → BackupTypes enum
      table.string('status', 100).defaultTo('in_progress').notNullable() // → BackupStatus enum

      table.string('file_path', 500).nullable()
      table.bigInteger('file_size_bytes').nullable()

      table.timestamp('started_at').notNullable()
      table.timestamp('completed_at').nullable()
      table.timestamp('expires_at').nullable()

      table.uuid('created_by_user_id').references('id').inTable('users').nullable()
      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
