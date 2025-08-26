import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization_invites'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .unique()
        .notNullable()

      table.uuid('organization_id').references('organizations.id').onDelete('CASCADE').notNullable()

      table.uuid('invited_by_user_id').references('users.id').onDelete('SET NULL').notNullable()

      table.uuid('canceled_by_user_id').references('users.id').onDelete('SET NULL').nullable()

      table.string('email', 254).notNullable()

      table
        .string('role_name', 100)
        .references('roles.name')
        .onDelete('RESTRICT') // Don't delete roles that have pending invites
        .notNullable() // → UserRoles enum

      table.timestamp('accepted_at').nullable()
      table.timestamp('canceled_at').nullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Prevent duplicate active invites for the same email / org
      table.unique(['organization_id', 'email'])

      table.index('expires_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
