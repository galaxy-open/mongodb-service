import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'oauth_access_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .notNullable()
      table.uuid('client_id').references('id').inTable('oauth_clients').onDelete('CASCADE')
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
      table
        .uuid('organization_id')
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
        .nullable()
      table.specificType('scopes', 'text[]').nullable()
      table.boolean('is_revoked').defaultTo(false)
      table.timestamp('expires_at').notNullable()
      table.timestamp('revoked_at').nullable()
      table.timestamp('created_at')

      // Indexes for token validation and cleanup
      table.index('expires_at')
      table.index(['user_id', 'client_id'])
      table.index(['organization_id', 'user_id'])
      table.index(['organization_id', 'client_id'])
      table.index('is_revoked')
      table.index(['id', 'is_revoked', 'expires_at']) // Composite for fast validation
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
