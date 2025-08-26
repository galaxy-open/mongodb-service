import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'docker_swarm_workers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .unique()
        .notNullable()

      table
        .uuid('docker_swarm_manager_id')
        .references('id')
        .inTable('docker_swarm_managers')
        .onDelete('SET NULL')

      table.integer('worker_number').notNullable().defaultTo(1)
      table.string('name', 100).notNullable() // 'worker-1', 'worker-eu-rbx-1', 'worker-1-ap'
      table.string('type', 100).notNullable() // → WorkerTypes enum

      table.string('instance_type').notNullable() // 'm5.large', 'n1-standard-4', etc.
      table.integer('max_instances').notNullable()
      table.integer('current_instances').defaultTo(0).notNullable()

      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index for common queries
      table.index(['docker_swarm_manager_id', 'is_active'])
      table.index(['docker_swarm_manager_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
