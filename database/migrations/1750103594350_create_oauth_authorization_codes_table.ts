import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'oauth_authorization_codes'

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
      table.text('redirect_uri').notNullable()
      table.specificType('scopes', 'text[]').nullable()
      table.string('state').nullable()
      // PKCE support (RFC 7636)
      table.string('code_challenge').nullable()
      table.string('code_challenge_method').nullable()
      table.timestamp('expires_at').notNullable()
      table.boolean('is_used').defaultTo(false)
      table.timestamp('used_at').nullable()
      table.timestamp('created_at')

      // Indexes for performance and cleanup
      table.index('expires_at')
      table.index(['client_id', 'user_id'])
      table.index(['organization_id', 'user_id'])
      table.index(['organization_id', 'client_id'])
      table.index('is_used')
      table.index(['code_challenge', 'code_challenge_method']) // For PKCE lookup
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
