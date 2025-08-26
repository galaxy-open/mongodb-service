import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .uuid('external_idp_id')
        .nullable()
        .references('id')
        .inTable('trusted_identity_providers')
        .onDelete('SET NULL')

      table.string('external_user_id', 255).nullable()

      table.boolean('is_system_admin').defaultTo(false).notNullable()

      // Make password nullable for JIT provisioned users
      table.string('password').nullable().alter()

      // Unique constraint for external identity
      table.unique(['external_idp_id', 'external_user_id'])

      // Indexes for external identity lookup
      table.index(['external_idp_id', 'external_user_id'])
      table.index('is_system_admin')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['external_idp_id', 'external_user_id'])
      table.dropForeign('external_idp_id')
      table.dropColumn('external_idp_id')
      table.dropColumn('external_user_id')
      table.dropColumn('is_system_admin')
    })

    // Set a default password for users with null passwords before making column NOT NULL
    await this.db
      .from(this.tableName)
      .whereNull('password')
      .update({ password: 'external_user_placeholder' })

    this.schema.alterTable(this.tableName, (table) => {
      table.string('password').notNullable().alter()
    })
  }
}
