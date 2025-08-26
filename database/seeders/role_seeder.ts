import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Role from '#models/role'
import UserRoles from '#enums/user_roles'

export default class extends BaseSeeder {
  async run() {
    // @TODO: Include descriptions
    await Role.createMany([
      { name: UserRoles.OWNER },
      { name: UserRoles.ADMIN },
      { name: UserRoles.DEVELOPER },
      { name: UserRoles.VIEWER },
    ])
  }
}
