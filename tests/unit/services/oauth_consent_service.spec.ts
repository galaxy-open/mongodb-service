import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OAuthConsentService from '#services/oauth_consent_service'
import OAuthConsentDataService from '#services/oauth_consent_data_service'
import OAuthConsentStorageService from '#services/oauth_consent_storage_service'
import OAuthConsentDecisionProcessorService from '#services/oauth_consent_decision_processor_service'
import { OAuthParams } from '#validators/oauth_authorize'
import UserFactory from '#database/factories/user_factory'
import User from '#models/user'

test.group('OAuthConsentService | Unit', (group) => {
  let service: OAuthConsentService
  let dataServiceStub: sinon.SinonStubbedInstance<OAuthConsentDataService>
  let storageServiceStub: sinon.SinonStubbedInstance<OAuthConsentStorageService>
  let decisionProcessorStub: sinon.SinonStubbedInstance<OAuthConsentDecisionProcessorService>
  let fakeUser: User

  const fakeParams: OAuthParams = {
    client_id: 'test-client',
    response_type: 'code',
    redirect_uri: 'https://client.app/callback',
    scope: 'database:read database:write',
  }

  group.each.setup(async () => {
    // Create stubs for all dependencies
    dataServiceStub = sinon.createStubInstance(OAuthConsentDataService)
    storageServiceStub = sinon.createStubInstance(OAuthConsentStorageService)
    decisionProcessorStub = sinon.createStubInstance(OAuthConsentDecisionProcessorService)

    // Swap in container
    app.container.swap(OAuthConsentDataService, () => dataServiceStub as any)
    app.container.swap(OAuthConsentStorageService, () => storageServiceStub as any)
    app.container.swap(OAuthConsentDecisionProcessorService, () => decisionProcessorStub as any)

    // Create fake data
    fakeUser = await UserFactory.make()
    // Mock the username getter to return the expected value
    Object.defineProperty(fakeUser, 'username', {
      get: () => 'testuser',
      configurable: true,
    })

    // Create service instance
    service = new OAuthConsentService(dataServiceStub, storageServiceStub, decisionProcessorStub)
  })

  group.each.teardown(() => {
    app.container.restore(OAuthConsentDataService)
    app.container.restore(OAuthConsentStorageService)
    app.container.restore(OAuthConsentDecisionProcessorService)
    sinon.restore()
  })

  test('needsConsent :: should return true when user has not consented', async ({ assert }) => {
    const userId = fakeUser.id
    const clientId = 'test-client'
    const scopes = ['database:read', 'database:write']

    storageServiceStub.hasConsentForScopes.resolves(false)

    const result = await service.needsConsent(userId, clientId, scopes)

    assert.isTrue(result)
    assert.isTrue(storageServiceStub.hasConsentForScopes.calledOnceWith(userId, clientId, scopes))
  })

  test('needsConsent :: should return false when user has already consented', async ({
    assert,
  }) => {
    const userId = fakeUser.id
    const clientId = 'test-client'
    const scopes = ['database:read']

    storageServiceStub.hasConsentForScopes.resolves(true)

    const result = await service.needsConsent(userId, clientId, scopes)

    assert.isFalse(result)
    assert.isTrue(storageServiceStub.hasConsentForScopes.calledOnceWith(userId, clientId, scopes))
  })

  test('getConsentData :: should delegate to consent data service', async ({ assert }) => {
    const expectedConsentData = {
      client: { name: 'Test Client', id: 'test-client' },
      scopes: [
        { scope: 'database:read', description: 'View your databases' },
        { scope: 'database:write', description: 'Manage your databases' },
      ],
      user: { username: fakeUser.username, email: fakeUser.email },
    }

    dataServiceStub.getConsentData.resolves(expectedConsentData)

    const result = await service.getConsentData(fakeParams, fakeUser)

    assert.deepEqual(result, expectedConsentData)
    assert.isTrue(dataServiceStub.getConsentData.calledOnceWith(fakeParams, fakeUser))
  })

  test('processConsentDecision :: should delegate to decision processor', async ({ assert }) => {
    const decision = 'approve'
    const userId = fakeUser.id
    const expectedResult = {
      redirectUrl: 'https://client.app/callback?code=123',
      shouldGrantConsent: true,
    }

    decisionProcessorStub.processDecision.resolves(expectedResult)

    const result = await service.processConsentDecision(decision, fakeParams, userId)

    assert.deepEqual(result, expectedResult)
    assert.isTrue(
      decisionProcessorStub.processDecision.calledOnceWith(decision, fakeParams, userId)
    )
  })

  test('processConsentDecision :: should handle denial decision', async ({ assert }) => {
    const decision = 'deny'
    const userId = fakeUser.id
    const expectedResult = {
      redirectUrl: 'https://client.app/callback?error=access_denied',
      shouldClearSession: true,
    }

    decisionProcessorStub.processDecision.resolves(expectedResult)

    const result = await service.processConsentDecision(decision, fakeParams, userId)

    assert.deepEqual(result, expectedResult)
    assert.isTrue(
      decisionProcessorStub.processDecision.calledOnceWith(decision, fakeParams, userId)
    )
  })

  test('getUserConsents :: should delegate to storage service', async ({ assert }) => {
    const userId = fakeUser.id
    const expectedConsents = [] as any[] // Simplified mock return

    storageServiceStub.getUserConsents.resolves(expectedConsents)

    const result = await service.getUserConsents(userId)

    assert.deepEqual(result, expectedConsents)
    assert.isTrue(storageServiceStub.getUserConsents.calledOnceWith(userId))
  })

  test('revokeConsent :: should delegate to storage service', async ({ assert }) => {
    const userId = fakeUser.id
    const clientId = 'test-client'

    storageServiceStub.revokeConsent.resolves()

    await service.revokeConsent(userId, clientId)

    assert.isTrue(storageServiceStub.revokeConsent.calledOnceWith(userId, clientId))
  })

  test('revokeConsent :: should handle storage service errors', async ({ assert }) => {
    const userId = fakeUser.id
    const clientId = 'test-client'
    const storageError = new Error('Database error')

    storageServiceStub.revokeConsent.rejects(storageError)

    try {
      await service.revokeConsent(userId, clientId)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database error')
      assert.isTrue(storageServiceStub.revokeConsent.calledOnceWith(userId, clientId))
    }
  })
})
