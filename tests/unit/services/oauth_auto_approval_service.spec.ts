import { test } from '@japa/runner'
import sinon from 'sinon'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import OAuthAutoApprovalService from '#services/oauth_auto_approval_service'
import OAuthAuthorizationCodeRepository from '#repositories/oauth_authorization_code_repository'
import OAuthAuthorizationCode from '#models/oauth_authorization_code'
import User from '#models/user'
import OAuthClient from '#models/oauth_client'
import { OAuthParams } from '#validators/oauth_authorize'

test.group('OAuthAutoApprovalService | Unit', (group) => {
  let service: OAuthAutoApprovalService
  let authCodeRepoStub: sinon.SinonStubbedInstance<OAuthAuthorizationCodeRepository>

  group.each.setup(() => {
    authCodeRepoStub = sinon.createStubInstance(OAuthAuthorizationCodeRepository)

    app.container.swap(OAuthAuthorizationCodeRepository, () => authCodeRepoStub as any)

    service = new OAuthAutoApprovalService(authCodeRepoStub)
  })

  group.each.teardown(() => {
    app.container.restore(OAuthAuthorizationCodeRepository)
    sinon.restore()
  })

  test('approve :: should generate code and return valid redirect URL', async ({ assert }) => {
    const fakeUser = { id: 'user-1' } as User
    const fakeClient = {
      id: 'client-uuid-1',
      redirectUris: ['https://client.app/callback'],
    } as OAuthClient
    const fakeParams: OAuthParams = {
      client_id: fakeClient.id,
      response_type: 'code',
      redirect_uri: fakeClient.redirectUris[0],
      scope: 'openid profile',
      state: 'abc-123-def-456',
    }
    const scopes = ['openid', 'profile']
    const createdAuthCode = {
      id: 'auth-code-uuid-123',
    } as OAuthAuthorizationCode

    // Setup stubs
    authCodeRepoStub.create.resolves(createdAuthCode)

    // Execute
    const result = await service.approve({
      user: fakeUser,
      client: fakeClient,
      params: fakeParams,
      scopes,
      organizationId: null,
    })

    // Verify
    assert.equal(
      result,
      'https://client.app/callback?code=auth-code-uuid-123&state=abc-123-def-456'
    )

    // Verify repository call
    assert.isTrue(authCodeRepoStub.create.calledOnce)
    const createCall = authCodeRepoStub.create.getCall(0)
    assert.equal(createCall.args[0].clientId, 'client-uuid-1')
    assert.equal(createCall.args[0].userId, 'user-1')
    assert.equal(createCall.args[0].redirectUri, 'https://client.app/callback')
    assert.deepEqual(createCall.args[0].scopes, ['openid', 'profile'])
    assert.equal(createCall.args[0].state, 'abc-123-def-456')
    assert.equal(createCall.args[0].isUsed, false)
    assert.isNull(createCall.args[0].organizationId)
  })

  test('approve :: should handle organization context', async ({ assert }) => {
    const fakeUser = { id: 'user-1' } as User
    const fakeClient = {
      id: 'client-uuid-1',
      redirectUris: ['https://client.app/callback'],
    } as OAuthClient
    const fakeParams: OAuthParams = {
      client_id: fakeClient.id,
      response_type: 'code',
      redirect_uri: fakeClient.redirectUris[0],
      scope: 'database:read',
    }
    const scopes = ['database:read']
    const organizationId = 'org-uuid-123'
    const createdAuthCode = {
      id: 'auth-code-uuid-456',
    } as OAuthAuthorizationCode

    // Setup stubs
    authCodeRepoStub.create.resolves(createdAuthCode)

    // Execute
    const result = await service.approve({
      user: fakeUser,
      client: fakeClient,
      params: fakeParams,
      scopes,
      organizationId,
    })

    // Verify
    assert.equal(result, 'https://client.app/callback?code=auth-code-uuid-456')

    // Verify organization context passed
    const createCall = authCodeRepoStub.create.getCall(0)
    assert.equal(createCall.args[0].organizationId, 'org-uuid-123')
  })

  test('approve :: should handle missing state parameter', async ({ assert }) => {
    const fakeUser = { id: 'user-1' } as User
    const fakeClient = {
      id: 'client-uuid-1',
      redirectUris: ['https://client.app/callback'],
    } as OAuthClient
    const fakeParams: OAuthParams = {
      client_id: fakeClient.id,
      response_type: 'code',
      redirect_uri: fakeClient.redirectUris[0],
      scope: 'openid',
    }
    const scopes = ['openid']
    const createdAuthCode = {
      id: 'auth-code-uuid-789',
    } as OAuthAuthorizationCode

    // Setup stubs
    authCodeRepoStub.create.resolves(createdAuthCode)

    // Execute
    const result = await service.approve({
      user: fakeUser,
      client: fakeClient,
      params: fakeParams,
      scopes,
      organizationId: null,
    })

    // Verify - no state parameter in URL
    assert.equal(result, 'https://client.app/callback?code=auth-code-uuid-789')

    // Verify state is undefined in repository call
    const createCall = authCodeRepoStub.create.getCall(0)
    assert.isUndefined(createCall.args[0].state)
  })

  test('approve :: should set proper expiration time', async ({ assert }) => {
    const fakeUser = { id: 'user-1' } as User
    const fakeClient = {
      id: 'client-uuid-1',
      redirectUris: ['https://client.app/callback'],
    } as OAuthClient
    const fakeParams: OAuthParams = {
      client_id: fakeClient.id,
      response_type: 'code',
      redirect_uri: fakeClient.redirectUris[0],
      scope: 'openid',
    }
    const scopes = ['openid']
    const createdAuthCode = {
      id: 'auth-code-uuid-999',
    } as OAuthAuthorizationCode

    // Setup stubs
    authCodeRepoStub.create.resolves(createdAuthCode)

    // Execute
    await service.approve({
      user: fakeUser,
      client: fakeClient,
      params: fakeParams,
      scopes,
      organizationId: null,
    })

    // Verify expiration is set to ~10 minutes from now
    const createCall = authCodeRepoStub.create.getCall(0)
    const expiresAt = createCall.args[0].expiresAt
    const tenMinutesFromNow = DateTime.now().plus({ minutes: 10 })
    const timeDiff = Math.abs(expiresAt!.diff(tenMinutesFromNow, 'seconds').seconds)

    // Should be within 5 seconds of 10 minutes from now
    assert.isTrue(timeDiff < 5)
  })
})
