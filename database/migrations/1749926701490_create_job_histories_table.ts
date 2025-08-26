import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'job_history'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .notNullable()

      table.string('job_id_bullmq', 255).unique().nullable()
      table.string('queue_name', 255).notNullable()
      table.string('job_name', 255).nullable()

      table.string('status', 100).notNullable() // → JobStatus enum

      table
        .uuid('database_instance_id')
        .references('id')
        .inTable('database_instances')
        .onDelete('SET NULL')
        .nullable()

      table.uuid('owner_id').references('id').inTable('owners').onDelete('SET NULL').notNullable()
      table
        .uuid('created_by_user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .notNullable()

      table.jsonb('input_data').nullable()
      table.jsonb('result_data').nullable()

      table.timestamp('created_at_queue').notNullable()
      table.timestamp('processing_started_at').nullable()
      table.timestamp('processing_finished_at').nullable()

      table.text('error_message').nullable()
      table.text('error_stacktrace').nullable()
      table.integer('attempts_made').defaultTo(0).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['database_instance_id'])
      table.index(['owner_id'])
      table.index(['created_by_user_id'])
      table.index(['status'])
      table.index(['queue_name', 'job_name'])
      table.index(['created_at_queue'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
