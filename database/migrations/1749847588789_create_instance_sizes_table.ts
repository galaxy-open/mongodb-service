import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'instance_sizes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .unique()
        .notNullable()
      table.string('name', 100).notNullable() // → DatabaseInstanceNames enum
      table.string('display_name', 100).notNullable() // 'Starter (Standalone)', 'Professional (Replica Set)'
      table.string('deployment_type', 100).notNullable() // → DeploymentTypes enum
      table.string('database_engine', 100).notNullable() // → DatabaseEngines enum
      table.decimal('cpu_cores', 8, 1).notNullable() // 0.5, 1.0, 2.0
      table.string('cpu_resources').notNullable() // 0.170
      table.integer('memory_mb').notNullable() // 512, 1024, 2048
      table.integer('disk_gb').notNullable() // 1, 10, 50
      table.integer('price_monthly_cents').notNullable() // 0, 900, 2500
      table.boolean('is_active').defaultTo(true).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()

      // Compound unique constraint for name + deployment type + database engine
      table.unique(['name', 'deployment_type', 'database_engine'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
