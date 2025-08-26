import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
        .unique()
        .notNullable()

      table.uuid('organization_id').references('organizations.id').onDelete('CASCADE').notNullable()

      table.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable()

      table.string('role_name', 100).references('roles.name').onDelete('RESTRICT').notNullable() // → UserRoles enum

      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Ensure a user can only have ONE role per organization
      table.unique(['organization_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
