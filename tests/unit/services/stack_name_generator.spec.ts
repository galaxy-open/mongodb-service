import { test } from '@japa/runner'
import sinon from 'sinon'
import string from '@adonisjs/core/helpers/string'
import StackNameGenerator from '#services/database_instance/helpers/stack_name_generator'
import DatabaseInstanceRepository from '#repositories/database_instance_repository'

test.group('StackNameGenerator | Unit', (group) => {
  let service: StackNameGenerator
  let repositoryStub: sinon.SinonStubbedInstance<DatabaseInstanceRepository>
  let loggerStub: any
  let stringStub: sinon.SinonStub

  group.each.setup(() => {
    repositoryStub = sinon.createStubInstance(DatabaseInstanceRepository)
    loggerStub = {
      warn: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    }
    stringStub = sinon.stub(string, 'uuid')

    service = new StackNameGenerator(repositoryStub as any, loggerStub)
  })

  group.each.teardown(() => {
    sinon.restore()
  })

  test('generateUniqueStackName :: should generate unique 12-character DNS-safe stackName', async ({
    assert,
  }) => {
    // Mock UUID that starts with a number (will need letter prefix)
    stringStub.returns('12345678-abcd-efgh-ijkl-mnopqrstuvwx')
    repositoryStub.findByStackName.resolves(null) // No existing stackName

    const result = await service.generateUniqueStackName()

    assert.equal(result.length, 12)
    assert.match(result, /^[a-z][a-z0-9]{11}$/) // Starts with letter, 12 chars total
    assert.isTrue(repositoryStub.findByStackName.calledOnce)
    assert.equal(repositoryStub.findByStackName.firstCall.args[0], result)
  })

  test('generateUniqueStackName :: should use UUID that already starts with letter', async ({
    assert,
  }) => {
    // Mock UUID that already starts with a letter
    stringStub.returns('abcdef12-3456-7890-abcd-efghijklmnop')
    repositoryStub.findByStackName.resolves(null)

    const result = await service.generateUniqueStackName()

    assert.equal(result, 'abcdef123456') // First 12 chars, hyphens removed
    assert.equal(result.length, 12)
    assert.match(result, /^[a-z][a-z0-9]{11}$/)
  })

  test('generateUniqueStackName :: should retry on collision and succeed', async ({ assert }) => {
    const firstUuid = 'abcdef12-3456-7890-abcd-efghijklmnop'
    const secondUuid = 'xyz98765-4321-0987-fedc-ba9876543210'

    stringStub.onFirstCall().returns(firstUuid)
    stringStub.onSecondCall().returns(secondUuid)

    // First call finds collision, second call is unique
    repositoryStub.findByStackName.onFirstCall().resolves({ id: 'existing' } as any)
    repositoryStub.findByStackName.onSecondCall().resolves(null)

    const result = await service.generateUniqueStackName()

    assert.equal(result, 'xyz987654321') // Second UUID, first 12 chars
    assert.equal(repositoryStub.findByStackName.callCount, 2)

    // Should log the collision warning
    assert.isTrue(loggerStub.warn.calledOnce)
    assert.deepEqual(loggerStub.warn.firstCall.args[0], {
      attempt: 1,
      stackName: 'abcdef123456',
      maxAttempts: 30,
    })
    assert.equal(
      loggerStub.warn.firstCall.args[1],
      'Stack name collision detected - generating new UUID'
    )

    // Should log success after retry
    assert.isTrue(loggerStub.info.calledOnce)
    assert.deepEqual(loggerStub.info.firstCall.args[0], {
      stackName: 'xyz987654321',
      attempts: 2,
    })
    assert.equal(loggerStub.info.firstCall.args[1], 'Generated unique stack name after retries')
  })

  test('generateUniqueStackName :: should handle UUID starting with number', async ({ assert }) => {
    // Mock UUID that starts with a number
    stringStub.returns('12345678-9abc-def0-1234-567890abcdef')
    repositoryStub.findByStackName.resolves(null)

    const result = await service.generateUniqueStackName()

    // Should start with a random letter, not the number
    assert.match(result, /^[a-z][a-z0-9]{11}$/)
    assert.equal(result.length, 12)
    assert.notEqual(result[0], '1') // Should not start with the original number
  })

  test('generateUniqueStackName :: should throw error after max attempts', async ({ assert }) => {
    stringStub.returns('abcdef12-3456-7890-abcd-efghijklmnop')
    // Always return existing instance (collision)
    repositoryStub.findByStackName.resolves({ id: 'existing' } as any)

    try {
      await service.generateUniqueStackName(3) // Set low max attempts for testing
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(
        error.message,
        'Failed to generate unique stack name after 3 attempts. Last attempted: abcdef123456'
      )
      assert.equal(repositoryStub.findByStackName.callCount, 3)
      assert.equal(loggerStub.warn.callCount, 3)
    }
  })

  test('generateUniqueStackName :: should use default maxAttempts of 30', async ({ assert }) => {
    stringStub.returns('abcdef12-3456-7890-abcd-efghijklmnop')
    repositoryStub.findByStackName.resolves({ id: 'existing' } as any)

    try {
      await service.generateUniqueStackName() // No maxAttempts specified
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.include(error.message, 'after 30 attempts')
      assert.equal(repositoryStub.findByStackName.callCount, 30)
    }
  })

  test('generateUniqueStackName :: should handle multiple collisions then success', async ({
    assert,
  }) => {
    const uuids = [
      'aaaa1111-2222-3333-4444-555555555555',
      'bbbb2222-3333-4444-5555-666666666666',
      'cccc3333-4444-5555-6666-777777777777',
      'dddd4444-5555-6666-7777-888888888888',
    ]

    uuids.forEach((uuid, index) => {
      stringStub.onCall(index).returns(uuid)
    })

    // First 3 calls have collisions, 4th is unique
    repositoryStub.findByStackName.onCall(0).resolves({ id: 'existing1' } as any)
    repositoryStub.findByStackName.onCall(1).resolves({ id: 'existing2' } as any)
    repositoryStub.findByStackName.onCall(2).resolves({ id: 'existing3' } as any)
    repositoryStub.findByStackName.onCall(3).resolves(null)

    const result = await service.generateUniqueStackName()

    assert.equal(result, 'dddd44445555') // 4th UUID
    assert.equal(repositoryStub.findByStackName.callCount, 4)
    assert.equal(loggerStub.warn.callCount, 3) // 3 collision warnings

    // Should log success after multiple retries
    assert.isTrue(loggerStub.info.calledOnce)
    assert.deepEqual(loggerStub.info.firstCall.args[0], {
      stackName: 'dddd44445555',
      attempts: 4,
    })
    assert.equal(loggerStub.info.firstCall.args[1], 'Generated unique stack name after retries')
  })

  test('generateUniqueStackName :: should not log info on first success', async ({ assert }) => {
    stringStub.returns('abcdef12-3456-7890-abcd-efghijklmnop')
    repositoryStub.findByStackName.resolves(null) // Success on first attempt

    await service.generateUniqueStackName()

    // Should not log info message when no retries needed
    assert.isFalse(loggerStub.info.called)
    assert.isFalse(loggerStub.warn.called)
  })

  test('generateUniqueStackName :: should generate different results on multiple calls', async ({
    assert,
  }) => {
    // Mock different UUIDs for each call
    stringStub.onCall(0).returns('aaaa1111-2222-3333-4444-555555555555')
    stringStub.onCall(1).returns('bbbb2222-3333-4444-5555-666666666666')
    stringStub.onCall(2).returns('cccc3333-4444-5555-6666-777777777777')

    repositoryStub.findByStackName.resolves(null)

    const result1 = await service.generateUniqueStackName()
    const result2 = await service.generateUniqueStackName()
    const result3 = await service.generateUniqueStackName()

    // All results should be different
    assert.notEqual(result1, result2)
    assert.notEqual(result2, result3)
    assert.notEqual(result1, result3)

    // All should follow the same pattern
    assert.match(result1, /^[a-z][a-z0-9]{11}$/)
    assert.match(result2, /^[a-z][a-z0-9]{11}$/)
    assert.match(result3, /^[a-z][a-z0-9]{11}$/)
  })

  test('DNS compatibility :: generated stackNames should be valid DNS labels', async ({
    assert,
  }) => {
    stringStub.returns('test-uuid-with-hyphens-and-more')
    repositoryStub.findByStackName.resolves(null)

    const result = await service.generateUniqueStackName()

    // Should not contain hyphens (DNS requirement)
    assert.isFalse(result.includes('-'))
    assert.isFalse(result.includes('_'))

    // Should only contain lowercase letters and digits
    assert.match(result, /^[a-z0-9]+$/)

    // Should start with a letter (DNS requirement)
    assert.match(result, /^[a-z]/)

    // Should be exactly 12 characters
    assert.equal(result.length, 12)
  })

  test('Docker compatibility :: generated stackNames should follow Docker naming rules', async ({
    assert,
  }) => {
    stringStub.returns('UPPERCASE-uuid-1234-5678-9ABC-DEF123456789')
    repositoryStub.findByStackName.resolves(null)

    const result = await service.generateUniqueStackName()

    // Should be lowercase only (Docker requirement)
    assert.equal(result, result.toLowerCase())

    // Should match Docker stack naming pattern [a-z0-9][a-z0-9_-]*
    // Our implementation is more restrictive: [a-z][a-z0-9]{11}
    assert.match(result, /^[a-z][a-z0-9]{11}$/)
  })

  test('MongoDB compatibility :: generated stackNames should be valid replica set names', async ({
    assert,
  }) => {
    stringStub.returns('mongodb-replica-set-name-test-12345')
    repositoryStub.findByStackName.resolves(null)

    const result = await service.generateUniqueStackName()

    // Should be under MongoDB's 80 character limit
    assert.isTrue(result.length <= 80)

    // Should not contain spaces or special characters
    assert.match(result, /^[a-z0-9]+$/)

    // Should start with letter (MongoDB preference)
    assert.match(result, /^[a-z]/)
  })
})
