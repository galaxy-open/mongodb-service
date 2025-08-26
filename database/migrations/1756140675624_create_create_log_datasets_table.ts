import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'log_datasets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .notNullable()

      table.string('database_engine', 100).nullable() // DatabaseEngines enum
      table.string('dataset_type', 100).notNullable() // LogDatasetTypes enum
      table.string('dataset_name', 255).notNullable() // The Axiom dataset name

      table.boolean('is_active').defaultTo(true).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()

      // Indexes
      table.index(['database_engine', 'dataset_type'], 'idx_log_datasets_engine_type')
      table.index(['is_active'], 'idx_log_datasets_active')

      // Unique constraint - only one active dataset per engine/type combination
      table.unique(['database_engine', 'dataset_type'], {
        indexName: 'uq_log_datasets_engine_type',
      })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
