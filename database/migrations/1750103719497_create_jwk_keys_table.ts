import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'jwk_keys'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .notNullable()
      table.string('key_type').notNullable() // kty (RSA, EC)
      table.string('algorithm').notNullable() // alg (RS256, ES256)
      table.string('use').notNullable() // use (sig, enc)
      table.jsonb('public_key_data').notNullable() // Public key components (n, e for RSA)
      table.text('private_key_pem').notNullable() // Encrypted private key
      table.boolean('is_active').defaultTo(true)
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Indexes for JWKS endpoint and key rotation
      table.index(['is_active', 'expires_at'])
      table.index('use')
      table.index('algorithm')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
