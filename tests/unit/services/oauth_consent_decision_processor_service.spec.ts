import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OAuthConsentDecisionProcessorService from '#services/oauth_consent_decision_processor_service'
import OAuthConsentStorageService from '#services/oauth_consent_storage_service'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import { OAuthParams } from '#validators/oauth_authorize'

test.group('OAuthConsentDecisionProcessorService | Unit', (group) => {
  let service: OAuthConsentDecisionProcessorService
  let consentStorageStub: sinon.SinonStubbedInstance<OAuthConsentStorageService>

  const fakeParams: OAuthParams = {
    client_id: 'test-client',
    response_type: 'code',
    redirect_uri: 'https://client.app/callback',
    scope: 'database:read database:write',
    state: 'abc-123',
  }
  const userId = 'user-123'

  group.each.setup(() => {
    consentStorageStub = sinon.createStubInstance(OAuthConsentStorageService)
    app.container.swap(OAuthConsentStorageService, () => consentStorageStub as any)

    service = new OAuthConsentDecisionProcessorService(consentStorageStub)
  })

  group.each.teardown(() => {
    app.container.restore(OAuthConsentStorageService)
    sinon.restore()
  })

  test('processDecision :: should handle approval and store consent', async ({ assert }) => {
    consentStorageStub.storeConsent.resolves()

    const result = await service.processDecision('approve', fakeParams, userId)

    assert.include(result.redirectUrl, '/oauth/authorize')
    assert.include(result.redirectUrl, 'client_id=test-client')
    assert.include(result.redirectUrl, 'response_type=code')
    assert.include(result.redirectUrl, 'state=abc-123')
    assert.isTrue(result.shouldGrantConsent)
    assert.isUndefined(result.shouldClearSession)

    assert.isTrue(
      consentStorageStub.storeConsent.calledOnceWith(
        userId,
        fakeParams.client_id,
        ['database:read', 'database:write'],
        365 * 24 * 60 * 60
      )
    )
  })

  test('processDecision :: should handle denial and return error redirect', async ({ assert }) => {
    const result = await service.processDecision('deny', fakeParams, userId)

    const url = new URL(result.redirectUrl)
    assert.equal(url.origin + url.pathname, fakeParams.redirect_uri)
    assert.equal(url.searchParams.get('error'), 'access_denied')
    assert.equal(url.searchParams.get('error_description'), 'User denied the request')
    assert.equal(url.searchParams.get('state'), fakeParams.state)
    assert.isTrue(result.shouldClearSession)
    assert.isUndefined(result.shouldGrantConsent)

    assert.isFalse(consentStorageStub.storeConsent.called)
  })

  test('processDecision :: should handle denial without state parameter', async ({ assert }) => {
    const paramsWithoutState = { ...fakeParams, state: undefined }

    const result = await service.processDecision('deny', paramsWithoutState, userId)

    const url = new URL(result.redirectUrl)
    assert.equal(url.searchParams.get('error'), 'access_denied')
    assert.isFalse(url.searchParams.has('state'))
  })

  test('processDecision :: should throw error for missing oauth params', async ({ assert }) => {
    try {
      await service.processDecision('approve', null as any, userId)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.message, 'No OAuth parameters or user provided')
    }
  })

  test('processDecision :: should throw error for missing user ID', async ({ assert }) => {
    try {
      await service.processDecision('approve', fakeParams, '')
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.message, 'No OAuth parameters or user provided')
    }
  })

  test('processDecision :: should use default scope when none provided', async ({ assert }) => {
    const paramsWithoutScope = { ...fakeParams, scope: undefined }
    consentStorageStub.storeConsent.resolves()

    await service.processDecision('approve', paramsWithoutScope, userId)

    assert.isTrue(
      consentStorageStub.storeConsent.calledOnceWith(
        userId,
        fakeParams.client_id,
        ['database:read'], // default scope
        365 * 24 * 60 * 60
      )
    )
  })

  test('processDecision :: should handle storage service errors', async ({ assert }) => {
    consentStorageStub.storeConsent.rejects(new Error('Database error'))

    try {
      await service.processDecision('approve', fakeParams, userId)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database error')
    }
  })
})
