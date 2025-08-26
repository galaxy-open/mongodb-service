import { test } from '@japa/runner'
import CodeGeneratorService from '#services/code_generator_service'

test.group('CodeGeneratorService', () => {
  test('should generate a secure password', async ({ assert }) => {
    const service = new CodeGeneratorService()
    const password = service.generatePassword()

    assert.isString(password)
    assert.equal(password.length, 16) // Default length
  })

  test('should generate password with custom length', async ({ assert }) => {
    const service = new CodeGeneratorService()
    const password = service.generatePassword(24)

    assert.isString(password)
    assert.equal(password.length, 24)
  })

  test('should generate MongoDB replica key', async ({ assert }) => {
    const service = new CodeGeneratorService()
    const replicaKey = service.generateMongoReplicaKey()

    assert.isString(replicaKey)
    assert.equal(replicaKey.length, 12) // Base64 encoded 9 bytes = 12 chars
  })

  test('should generate unique passwords', async ({ assert }) => {
    const service = new CodeGeneratorService()
    const password1 = service.generatePassword()
    const password2 = service.generatePassword()

    assert.notEqual(password1, password2)
  })
})
