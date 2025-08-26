import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import UserProvisioningService, { JITUserData } from '#services/user_provisioning_service'
import UserRepository from '#repositories/user_repository'
import UserFactory from '#database/factories/user_factory'

test.group('UserProvisioningService | Unit', (group) => {
  let service: UserProvisioningService
  let userRepositoryStub: sinon.SinonStubbedInstance<UserRepository>

  const jitUserData: JITUserData = {
    email: 'test@example.com',
    username: 'testuser',
    externalIdpId: 'idp-123',
    externalUserId: 'ext-user-456',
  }

  group.each.setup(() => {
    userRepositoryStub = sinon.createStubInstance(UserRepository)
    app.container.swap(UserRepository, () => userRepositoryStub as any)

    service = new UserProvisioningService(userRepositoryStub)
  })

  group.each.teardown(() => {
    app.container.restore(UserRepository)
    sinon.restore()
  })

  test('provisionUser :: should create new user when user does not exist', async ({ assert }) => {
    const newUser = await UserFactory.make()

    userRepositoryStub.findByEmail.resolves(null)
    userRepositoryStub.createJITUser.resolves(newUser)

    const result = await service.provisionUser(jitUserData)

    assert.equal(result, newUser)
    assert.isTrue(userRepositoryStub.findByEmail.calledOnceWith(jitUserData.email))
    assert.isTrue(
      userRepositoryStub.createJITUser.calledOnceWith({
        email: jitUserData.email,
        username: jitUserData.username,
        externalIdpId: jitUserData.externalIdpId,
        externalUserId: jitUserData.externalUserId,
      })
    )
  })

  test('provisionUser :: should return existing user when already linked', async ({ assert }) => {
    const existingUser = await UserFactory.merge({
      email: jitUserData.email,
      externalIdpId: 'existing-idp',
      externalUserId: 'existing-user-id',
    }).make()

    userRepositoryStub.findByEmail.resolves(existingUser)

    const result = await service.provisionUser(jitUserData)

    assert.equal(result, existingUser)
    assert.isTrue(userRepositoryStub.findByEmail.calledOnceWith(jitUserData.email))
    assert.isFalse(userRepositoryStub.createJITUser.called)
  })

  test('provisionUser :: should link existing user when not linked to external provider', async ({
    assert,
  }) => {
    const existingUser = await UserFactory.merge({
      email: jitUserData.email,
      externalIdpId: null,
      externalUserId: null,
    }).make()

    // Mock the merge and save methods
    const saveStub = sinon.stub().resolves(existingUser)
    const mergeStub = sinon.stub().returns({ save: saveStub })
    existingUser.merge = mergeStub

    userRepositoryStub.findByEmail.resolves(existingUser)

    const result = await service.provisionUser(jitUserData)

    assert.equal(result, existingUser)
    assert.isTrue(userRepositoryStub.findByEmail.calledOnceWith(jitUserData.email))
    assert.isTrue(
      mergeStub.calledOnceWith({
        externalIdpId: jitUserData.externalIdpId,
        externalUserId: jitUserData.externalUserId,
      })
    )
    assert.isTrue(saveStub.calledOnce)
    assert.isFalse(userRepositoryStub.createJITUser.called)
  })

  test('provisionUser :: should link user when only externalIdpId is missing', async ({
    assert,
  }) => {
    const existingUser = await UserFactory.merge({
      email: jitUserData.email,
      externalIdpId: null,
      externalUserId: 'some-value',
    }).make()

    const saveStub = sinon.stub().resolves(existingUser)
    const mergeStub = sinon.stub().returns({ save: saveStub })
    existingUser.merge = mergeStub

    userRepositoryStub.findByEmail.resolves(existingUser)

    const result = await service.provisionUser(jitUserData)

    assert.equal(result, existingUser)
    assert.isTrue(mergeStub.calledOnce)
    assert.isTrue(saveStub.calledOnce)
  })

  test('provisionUser :: should link user when only externalUserId is missing', async ({
    assert,
  }) => {
    const existingUser = await UserFactory.merge({
      email: jitUserData.email,
      externalIdpId: 'some-idp',
      externalUserId: null,
    }).make()

    const saveStub = sinon.stub().resolves(existingUser)
    const mergeStub = sinon.stub().returns({ save: saveStub })
    existingUser.merge = mergeStub

    userRepositoryStub.findByEmail.resolves(existingUser)

    const result = await service.provisionUser(jitUserData)

    assert.equal(result, existingUser)
    assert.isTrue(mergeStub.calledOnce)
    assert.isTrue(saveStub.calledOnce)
  })

  test('provisionUser :: should handle repository errors when creating user', async ({
    assert,
  }) => {
    const repositoryError = new Error('Database error')
    userRepositoryStub.findByEmail.resolves(null)
    userRepositoryStub.createJITUser.rejects(repositoryError)

    try {
      await service.provisionUser(jitUserData)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database error')
    }
  })

  test('provisionUser :: should handle repository errors when finding user', async ({ assert }) => {
    const repositoryError = new Error('Database error')
    userRepositoryStub.findByEmail.rejects(repositoryError)

    try {
      await service.provisionUser(jitUserData)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database error')
    }
  })

  test('provisionUser :: should handle save errors when linking user', async ({ assert }) => {
    const existingUser = await UserFactory.merge({
      email: jitUserData.email,
      externalIdpId: null,
      externalUserId: null,
    }).make()

    const saveError = new Error('Save failed')
    const saveStub = sinon.stub().rejects(saveError)
    const mergeStub = sinon.stub().returns({ save: saveStub })
    existingUser.merge = mergeStub

    userRepositoryStub.findByEmail.resolves(existingUser)

    try {
      await service.provisionUser(jitUserData)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Save failed')
    }
  })
})
