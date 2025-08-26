import factory from '@adonisjs/lucid/factories'
import User from '#models/user'

const UserFactory = factory
  .define(User, ({ faker }) => {
    return {
      email: faker.internet.email().toLowerCase(),
      username: faker.internet
        .username()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, ''),
      password: 'password123',
    }
  })
  .build()

export default UserFactory
