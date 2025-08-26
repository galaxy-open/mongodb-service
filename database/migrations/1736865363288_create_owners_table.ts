import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'owners'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .notNullable()

      table.uuid('user_id').nullable()
      table.uuid('organization_id').nullable()

      // Exactly one of user_id OR organization_id must be set
      table.check(
        '(user_id IS NOT NULL AND organization_id IS NULL) OR (user_id IS NULL AND organization_id IS NOT NULL)'
      )

      // Ensure one-to-one relationships
      table.unique(['user_id'])
      table.unique(['organization_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
