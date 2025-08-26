import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'database_deployment_workers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('database_deployment_id')
        .notNullable()
        .references('id')
        .inTable('database_deployments')
        .onDelete('CASCADE')

      table
        .uuid('docker_swarm_worker_id')
        .notNullable()
        .references('id')
        .inTable('docker_swarm_workers')
        .onDelete('CASCADE')

      table.timestamp('assigned_at').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Composite primary key
      table.primary(['database_deployment_id', 'docker_swarm_worker_id'])

      // Index for performance
      table.index(['docker_swarm_worker_id'], 'idx_deployment_workers_worker_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
