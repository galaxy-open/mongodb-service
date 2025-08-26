import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'database_deployments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .uuid('docker_swarm_manager_id')
        .nullable()
        .references('id')
        .inTable('docker_swarm_managers')
        .onDelete('SET NULL')
        .after('backup_enabled')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('docker_swarm_manager_id')
    })
  }
}
