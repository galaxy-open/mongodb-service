import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'oauth_refresh_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('token_hash').primary()
      table
        .string('access_token_hash')
        .references('token_hash')
        .inTable('oauth_access_tokens')
        .onDelete('CASCADE')
      table.string('client_id').references('client_id').inTable('oauth_clients').onDelete('CASCADE')
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
      table
        .uuid('organization_id')
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
        .nullable()
      table.specificType('scopes', 'text[]').nullable()
      table.boolean('is_revoked').defaultTo(false)
      table.timestamp('expires_at').nullable() // Refresh tokens can be long-lived
      table.timestamp('revoked_at').nullable()
      table.timestamp('created_at')

      // Indexes for token refresh and cleanup
      table.index('expires_at')
      table.index(['user_id', 'client_id'])
      table.index(['organization_id', 'user_id'])
      table.index(['organization_id', 'client_id'])
      table.index('is_revoked')
      table.index('access_token_hash') // For token rotation
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
