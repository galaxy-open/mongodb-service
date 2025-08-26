import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'database_instances'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .notNullable()

      table.uuid('owner_id').references('id').inTable('owners').onDelete('CASCADE').notNullable()

      table.string('name', 255).notNullable()
      table.string('stack_name', 255).notNullable()

      table.string('database_engine', 100).notNullable() // → DatabaseEngines enum
      table.string('deployment_type', 100).notNullable() // → DeploymentTypes enum
      table.string('tls_mode', 10).defaultTo('on').notNullable() // → TLSModes enum
      table.uuid('instance_size_id').references('id').inTable('instance_sizes').notNullable()
      table.string('region_code', 100).references('code').inTable('regions').notNullable() // → RegionCodes enum
      table
        .string('database_version', 100)
        .references('version')
        .inTable('database_versions')
        .notNullable() // → DatabaseVersions enum

      table.string('status', 100).defaultTo('requested').notNullable() // → InstanceStatus enum
      table.integer('container_count').defaultTo(1).notNullable()

      table.uuid('created_by_user_id').references('id').inTable('users').notNullable()
      table.timestamp('scheduled_deletion_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()

      // Indexes for performance
      table.index(['owner_id'], 'idx_databases_owner')
      table.index(['status'], 'idx_databases_status')
      table.index(['created_by_user_id'], 'idx_databases_created_by')
      table.index(['deployment_type'], 'idx_databases_type')
      table.index(['tls_mode'], 'idx_databases_tls')

      // Unique constraints
      table.unique(['stack_name'], { indexName: 'uq_databases_service_name' })
      table.unique(['owner_id', 'name'], { indexName: 'uq_databases_name_per_owner' })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
