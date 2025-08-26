import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'oauth_consents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .notNullable()

      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table
        .string('client_id')
        .notNullable()
        .references('client_id')
        .inTable('oauth_clients')
        .onDelete('CASCADE')
      table.specificType('scopes', 'text[]').notNullable()
      table.timestamp('granted_at').notNullable()
      table.timestamp('expires_at').nullable() // Null means no expiration
      table.boolean('is_revoked').defaultTo(false).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['user_id', 'client_id'])
      table.index('is_revoked')
      table.index('expires_at')

      // Unique constraint: one consent record per user/client combination
      table.unique(['user_id', 'client_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
