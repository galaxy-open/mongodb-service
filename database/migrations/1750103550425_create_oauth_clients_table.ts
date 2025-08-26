import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'oauth_clients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('client_id').primary()
      table.string('client_secret_hash', 1000).notNullable()
      table.string('client_name').notNullable()
      table.specificType('redirect_uris', 'text[]').notNullable()
      table
        .specificType('grant_types', 'text[]')
        .notNullable()
        .defaultTo('{authorization_code,refresh_token}')
      table.specificType('allowed_scopes', 'text[]').nullable()
      table.boolean('is_trusted').defaultTo(false)
      table.boolean('is_confidential').defaultTo(true)
      table.integer('access_token_lifetime').defaultTo(3600) // 1 hour
      table.integer('refresh_token_lifetime').defaultTo(2592000) // 30 days
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Indexes
      table.index('client_name')
      table.index('is_trusted')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
