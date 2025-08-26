import factory from '@adonisjs/lucid/factories'
import Role from '#models/role'
import UserRoles from '#enums/user_roles'

export const RoleFactory = factory
  .define(Role, async ({ faker }) => {
    return {
      name: faker.helpers.arrayElement(Object.values(UserRoles)),
      description: faker.lorem.sentence(),
    }
  })
  .build()

export default RoleFactory
