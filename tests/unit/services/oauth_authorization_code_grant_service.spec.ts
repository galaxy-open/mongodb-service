import { test } from '@japa/runner'
import sinon from 'sinon'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import OAuthAuthorizationCodeGrantService from '#services/oauth_authorization_code_grant_service'
import OAuthTokenStorageService from '#services/oauth_token_storage_service'
import OAuthAuthorizationCodeRepository from '#repositories/oauth_authorization_code_repository'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import { OAuthTokenParams } from '#validators/oauth_token'
import OAuthClient from '#models/oauth_client'
import OAuthAuthorizationCode from '#models/oauth_authorization_code'
import OAuthAccessToken from '#models/oauth_access_token'
import OAuthRefreshToken from '#models/oauth_refresh_token'

test.group('OAuthAuthorizationCodeGrantService | Unit', (group) => {
  let service: OAuthAuthorizationCodeGrantService
  let authCodeRepoStub: sinon.SinonStubbedInstance<OAuthAuthorizationCodeRepository>
  let tokenStorageStub: sinon.SinonStubbedInstance<OAuthTokenStorageService>

  group.each.setup(() => {
    authCodeRepoStub = sinon.createStubInstance(OAuthAuthorizationCodeRepository)
    tokenStorageStub = sinon.createStubInstance(OAuthTokenStorageService)

    app.container.swap(OAuthAuthorizationCodeRepository, () => authCodeRepoStub as any)
    app.container.swap(OAuthTokenStorageService, () => tokenStorageStub as any)

    service = new OAuthAuthorizationCodeGrantService(authCodeRepoStub, tokenStorageStub)
  })

  group.each.teardown(() => {
    app.container.restore(OAuthAuthorizationCodeRepository)
    app.container.restore(OAuthTokenStorageService)
    sinon.restore()
  })

  test('handle :: should successfully exchange authorization code for tokens', async ({
    assert,
  }) => {
    // Setup test data
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'valid-auth-code',
      redirect_uri: 'https://client.app/callback',
    }

    const client = {
      id: 'test-client-uuid',
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 86400,
    } as OAuthClient

    const authCode = {
      id: 'auth-code-uuid',
      userId: 'user-123',
      isUsed: false,
      expiresAt: DateTime.now().plus({ minutes: 10 }),
      scopes: ['database:read', 'database:write'],
    } as unknown as OAuthAuthorizationCode

    const storedTokens = {
      accessTokenRecord: { id: 'access-token-uuid' } as OAuthAccessToken,
      refreshTokenRecord: { id: 'refresh-token-uuid' } as OAuthRefreshToken,
    }

    // Setup stubs
    authCodeRepoStub.findAndValidate.resolves(authCode)
    authCodeRepoStub.markAsUsed.resolves()
    tokenStorageStub.storeTokens.resolves(storedTokens)

    // Execute
    const result = await service.handle(params, client)

    // Verify response
    assert.equal(result.access_token, 'access-token-uuid')
    assert.equal(result.token_type, 'Bearer')
    assert.equal(result.expires_in, 3600)
    assert.equal(result.refresh_token, 'refresh-token-uuid')
    assert.equal(result.scope, 'database:read database:write')

    // Verify method calls
    assert.isTrue(authCodeRepoStub.findAndValidate.calledOnce)
    assert.isTrue(authCodeRepoStub.markAsUsed.calledWith('auth-code-uuid'))
    assert.isTrue(tokenStorageStub.storeTokens.calledOnce)
  })

  test('handle :: should throw error when code is missing', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      redirect_uri: 'https://client.app/callback',
    }

    const client = { id: 'test-client-uuid' } as OAuthClient

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
    }
  })

  test('handle :: should throw error when redirect_uri is missing', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'valid-auth-code',
    }

    const client = { id: 'test-client-uuid' } as OAuthClient

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
    }
  })

  test('handle :: should throw error when authorization code is not found', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'invalid-auth-code',
      redirect_uri: 'https://client.app/callback',
    }

    const client = { id: 'test-client-uuid' } as OAuthClient

    authCodeRepoStub.findAndValidate.resolves(null)

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
    }
  })

  test('handle :: should throw error when authorization code is already used', async ({
    assert,
  }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'used-auth-code',
      redirect_uri: 'https://client.app/callback',
    }

    const client = { id: 'test-client-uuid' } as OAuthClient

    const authCode = {
      id: 'auth-code-uuid',
      isUsed: true,
      expiresAt: DateTime.now().plus({ minutes: 10 }),
    } as unknown as OAuthAuthorizationCode

    authCodeRepoStub.findAndValidate.resolves(authCode)

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
    }
  })

  test('handle :: should throw error when authorization code is expired', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'expired-auth-code',
      redirect_uri: 'https://client.app/callback',
    }

    const client = { id: 'test-client-uuid' } as OAuthClient

    const authCode = {
      id: 'auth-code-uuid',
      isUsed: false,
      expiresAt: DateTime.now().minus({ minutes: 10 }), // Expired
    } as unknown as OAuthAuthorizationCode

    authCodeRepoStub.findAndValidate.resolves(authCode)

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
    }
  })
})
