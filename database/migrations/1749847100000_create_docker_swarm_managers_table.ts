import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'docker_swarm_managers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .notNullable()

      table.uuid('owner_id').references('id').inTable('owners').onDelete('CASCADE').nullable()

      table.string('name', 255).notNullable()
      table.string('region_code', 100).references('code').inTable('regions').notNullable() // → RegionCodes enum
      table.string('hostname_prefix', 100).notNullable() // 'mongodb', 'eu-rbx-mongodb', 'ap-syd-mongodb'
      table.string('service_type', 100).notNullable() // → ServiceTypes enum
      table.string('cluster_type', 100).notNullable() // → ClusterTypes enum
      table.string('docker_host_url', 500).notNullable()

      // Encrypted Certificates
      table.text('ca')
      table.text('cert')
      table.text('key')

      table.string('health_status', 100).defaultTo('healthy') // → ClusterHealthStatus enum
      table.timestamp('last_health_check').nullable()

      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Indexes for performance
      table.index(
        ['owner_id', 'service_type', 'cluster_type', 'is_active'],
        'idx_docker_clusters_owner_service_type'
      )
      table.index(['service_type', 'cluster_type', 'is_active'], 'idx_docker_clusters_service_type')
      table.index(['health_status'], 'idx_docker_clusters_health')
      table.index(['is_active'], 'idx_docker_clusters_active')

      // Unique constraints
      table.unique(['owner_id', 'name'], { indexName: 'uq_docker_clusters_owner_name' })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
