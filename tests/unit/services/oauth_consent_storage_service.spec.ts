import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OAuthConsentStorageService from '#services/oauth_consent_storage_service'
import OAuthConsentRepository from '#repositories/oauth_consent_repository'
import { DateTime } from 'luxon'

test.group('OAuthConsentStorageService | Unit', (group) => {
  let service: OAuthConsentStorageService
  let consentRepositoryStub: sinon.SinonStubbedInstance<OAuthConsentRepository>

  const userId = 'user-123'
  const clientId = 'client-456'
  const scopes = ['database:read', 'database:write']

  group.each.setup(() => {
    consentRepositoryStub = sinon.createStubInstance(OAuthConsentRepository)
    app.container.swap(OAuthConsentRepository, () => consentRepositoryStub as any)

    service = new OAuthConsentStorageService(consentRepositoryStub)
  })

  group.each.teardown(() => {
    app.container.restore(OAuthConsentRepository)
    sinon.restore()
  })

  test('hasConsentForScopes :: should delegate to repository', async ({ assert }) => {
    consentRepositoryStub.hasConsentForScopes.resolves(true)

    const result = await service.hasConsentForScopes(userId, clientId, scopes)

    assert.isTrue(result)
    assert.isTrue(
      consentRepositoryStub.hasConsentForScopes.calledOnceWith(userId, clientId, scopes)
    )
  })

  test('hasConsentForScopes :: should return false when no consent exists', async ({ assert }) => {
    consentRepositoryStub.hasConsentForScopes.resolves(false)

    const result = await service.hasConsentForScopes(userId, clientId, scopes)

    assert.isFalse(result)
    assert.isTrue(
      consentRepositoryStub.hasConsentForScopes.calledOnceWith(userId, clientId, scopes)
    )
  })

  test('storeConsent :: should store consent with expiration', async ({ assert }) => {
    const expiresIn = 3600 // 1 hour
    consentRepositoryStub.createOrUpdate.resolves()

    await service.storeConsent(userId, clientId, scopes, expiresIn)

    assert.isTrue(consentRepositoryStub.createOrUpdate.calledOnce)
    const callArgs = consentRepositoryStub.createOrUpdate.firstCall.args[0]

    assert.equal(callArgs.userId, userId)
    assert.equal(callArgs.clientId, clientId)
    assert.deepEqual(callArgs.scopes, scopes)
    assert.isTrue(DateTime.isDateTime(callArgs.expiresAt))
  })

  test('storeConsent :: should store consent without expiration', async ({ assert }) => {
    consentRepositoryStub.createOrUpdate.resolves()

    await service.storeConsent(userId, clientId, scopes)

    assert.isTrue(consentRepositoryStub.createOrUpdate.calledOnce)
    const callArgs = consentRepositoryStub.createOrUpdate.firstCall.args[0]

    assert.equal(callArgs.userId, userId)
    assert.equal(callArgs.clientId, clientId)
    assert.deepEqual(callArgs.scopes, scopes)
    assert.isNull(callArgs.expiresAt)
  })

  test('revokeConsent :: should delegate to repository', async ({ assert }) => {
    consentRepositoryStub.revoke.resolves()

    await service.revokeConsent(userId, clientId)

    assert.isTrue(consentRepositoryStub.revoke.calledOnceWith(userId, clientId))
  })

  test('getUserConsents :: should delegate to repository', async ({ assert }) => {
    const mockConsents = [] as any[]
    consentRepositoryStub.findByUser.resolves(mockConsents)

    const result = await service.getUserConsents(userId)

    assert.deepEqual(result, mockConsents)
    assert.isTrue(consentRepositoryStub.findByUser.calledOnceWith(userId))
  })

  test('storeConsent :: should handle repository errors', async ({ assert }) => {
    const repositoryError = new Error('Database error')
    consentRepositoryStub.createOrUpdate.rejects(repositoryError)

    try {
      await service.storeConsent(userId, clientId, scopes)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database error')
    }
  })

  test('revokeConsent :: should handle repository errors', async ({ assert }) => {
    const repositoryError = new Error('Database error')
    consentRepositoryStub.revoke.rejects(repositoryError)

    try {
      await service.revokeConsent(userId, clientId)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database error')
    }
  })
})
