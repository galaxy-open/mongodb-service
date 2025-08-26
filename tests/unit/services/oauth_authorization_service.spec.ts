import { test } from '@japa/runner'
import sinon from 'sinon'
import OAuthAuthorizationService from '#services/oauth_authorization_service'
import OAuthClientValidatorService from '#services/oauth_client_validator_service'
import OAuthAutoApprovalService from '#services/oauth_auto_approval_service'
import OAuthConsentService from '#services/oauth_consent_service'
import { OAuthParams } from '#validators/oauth_authorize'
import OAuthClient from '#models/oauth_client'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import UserFactory from '#database/factories/user_factory'
import { OAuthClientFactory } from '#database/factories/oauth_client_factory'
import User from '#models/user'

test.group('OAuthAuthorizationService | Unit', (group) => {
  let clientValidatorStub: sinon.SinonStubbedInstance<OAuthClientValidatorService>
  let autoApprovalServiceStub: sinon.SinonStubbedInstance<OAuthAutoApprovalService>
  let consentServiceStub: sinon.SinonStubbedInstance<OAuthConsentService>
  let service: OAuthAuthorizationService
  let fakeUser: User
  let fakeClient: OAuthClient

  const fakeParams: OAuthParams = {
    client_id: 'test-client',
    response_type: 'code',
    redirect_uri: 'https://client.app/callback',
    scope: 'database:read database:write',
  }

  group.each.setup(async () => {
    clientValidatorStub = sinon.createStubInstance(OAuthClientValidatorService)
    autoApprovalServiceStub = sinon.createStubInstance(OAuthAutoApprovalService)
    consentServiceStub = sinon.createStubInstance(OAuthConsentService)

    fakeUser = await UserFactory.make()
    fakeClient = await OAuthClientFactory.merge({
      clientId: fakeParams.client_id,
      isTrusted: false,
    }).make()

    service = new OAuthAuthorizationService(
      clientValidatorStub,
      autoApprovalServiceStub,
      consentServiceStub
    )
  })

  group.each.teardown(() => {
    sinon.restore()
  })

  test('authorize :: should auto-approve and redirect for trusted clients', async ({ assert }) => {
    const trustedClient = await OAuthClientFactory.merge({
      clientId: fakeParams.client_id,
      isTrusted: true,
    }).make()
    const expectedRedirectUrl = 'https://client.app/callback?code=new-code'

    clientValidatorStub.validate.resolves(trustedClient)
    autoApprovalServiceStub.approve.resolves(expectedRedirectUrl)

    const result = await service.authorize({
      params: fakeParams,
      user: fakeUser,
      consentGranted: false,
      organizationId: null,
    })

    const expectedScopes = ['database:read', 'database:write']
    assert.isTrue(
      autoApprovalServiceStub.approve.calledOnceWith({
        user: fakeUser,
        client: trustedClient,
        params: fakeParams,
        scopes: expectedScopes,
        organizationId: null,
      })
    )
    assert.isFalse(consentServiceStub.needsConsent.called)
    assert.deepEqual(result, {
      redirectUrl: expectedRedirectUrl,
    })
  })

  test('authorize :: should auto-approve if user has persistent consent', async ({ assert }) => {
    const expectedRedirectUrl = 'https://client.app/callback?code=new-code'

    clientValidatorStub.validate.resolves(fakeClient)
    consentServiceStub.needsConsent.resolves(false)
    autoApprovalServiceStub.approve.resolves(expectedRedirectUrl)

    const result = await service.authorize({
      params: fakeParams,
      user: fakeUser,
      consentGranted: false,
      organizationId: null,
    })

    const expectedScopes = ['database:read', 'database:write']
    assert.isTrue(
      consentServiceStub.needsConsent.calledOnceWith(
        fakeUser.id,
        fakeClient.clientId,
        expectedScopes
      )
    )
    assert.isTrue(
      autoApprovalServiceStub.approve.calledOnceWith({
        user: fakeUser,
        client: fakeClient,
        params: fakeParams,
        scopes: expectedScopes,
        organizationId: null,
      })
    )
    assert.deepEqual(result, {
      redirectUrl: expectedRedirectUrl,
    })
  })

  test('authorize :: should auto-approve if consent was granted', async ({ assert }) => {
    const expectedRedirectUrl = 'https://client.app/callback?code=new-code'

    clientValidatorStub.validate.resolves(fakeClient)
    autoApprovalServiceStub.approve.resolves(expectedRedirectUrl)

    const result = await service.authorize({
      params: fakeParams,
      user: fakeUser,
      consentGranted: true,
      organizationId: null,
    })

    assert.isFalse(consentServiceStub.needsConsent.called)
    assert.isTrue(
      autoApprovalServiceStub.approve.calledOnceWith({
        user: fakeUser,
        client: fakeClient,
        params: fakeParams,
        scopes: ['database:read', 'database:write'],
        organizationId: null,
      })
    )
    assert.deepEqual(result, {
      redirectUrl: expectedRedirectUrl,
      shouldClearSession: true,
    })
  })

  test('authorize :: should redirect to consent page for untrusted clients without consent', async ({
    assert,
  }) => {
    clientValidatorStub.validate.resolves(fakeClient)
    consentServiceStub.needsConsent.resolves(true)

    const result = await service.authorize({
      params: fakeParams,
      user: fakeUser,
      consentGranted: false,
      organizationId: null,
    })

    assert.deepEqual(result, {
      redirectUrl: '/oauth/consent',
    })
  })

  test('authorize :: should use default scope if none is provided', async ({ assert }) => {
    const paramsWithoutScope = { ...fakeParams, scope: undefined }

    clientValidatorStub.validate.resolves(fakeClient)
    consentServiceStub.needsConsent.resolves(true)

    const result = await service.authorize({
      params: paramsWithoutScope,
      user: fakeUser,
      consentGranted: false,
      organizationId: null,
    })

    assert.isTrue(
      consentServiceStub.needsConsent.calledOnceWith(
        fakeUser.id,
        fakeClient.clientId,
        ['database:read'] // Default scope
      )
    )
    assert.deepEqual(result, {
      redirectUrl: '/oauth/consent',
    })
  })

  test('authorize :: should throw error on invalid client validation', async ({ assert }) => {
    const error = new InvalidOAuthRequestException('invalid_client', 'Invalid client')
    clientValidatorStub.validate.rejects(error)

    try {
      await service.authorize({
        params: fakeParams,
        user: fakeUser,
        consentGranted: false,
        organizationId: null,
      })
      assert.fail('Expected an error to be thrown')
    } catch (err) {
      assert.instanceOf(err, InvalidOAuthRequestException)
      assert.equal(err.error, 'invalid_client')
      assert.equal(err.errorDescription, 'Invalid client')
    }
  })
})
