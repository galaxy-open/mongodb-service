import { test } from '@japa/runner'
import sinon from 'sinon'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import OAuthAuthorizationCodeGrantService from '#services/oauth_authorization_code_grant_service'
import CodeGeneratorService from '#services/code_generator_service'
import OAuthTokenStorageService from '#services/oauth_token_storage_service'
import OAuthAuthorizationCodeRepository from '#repositories/oauth_authorization_code_repository'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import { OAuthTokenParams } from '#validators/oauth_token'
import OAuthClient from '#models/oauth_client'
import OAuthAuthorizationCode from '#models/oauth_authorization_code'

test.group('OAuthAuthorizationCodeGrantService | Unit', (group) => {
  let service: OAuthAuthorizationCodeGrantService
  let authCodeRepoStub: sinon.SinonStubbedInstance<OAuthAuthorizationCodeRepository>
  let codeGeneratorStub: sinon.SinonStubbedInstance<CodeGeneratorService>
  let tokenStorageStub: sinon.SinonStubbedInstance<OAuthTokenStorageService>

  group.each.setup(() => {
    authCodeRepoStub = sinon.createStubInstance(OAuthAuthorizationCodeRepository)
    codeGeneratorStub = sinon.createStubInstance(CodeGeneratorService)
    tokenStorageStub = sinon.createStubInstance(OAuthTokenStorageService)

    app.container.swap(OAuthAuthorizationCodeRepository, () => authCodeRepoStub as any)
    app.container.swap(CodeGeneratorService, () => codeGeneratorStub as any)
    app.container.swap(OAuthTokenStorageService, () => tokenStorageStub as any)

    service = new OAuthAuthorizationCodeGrantService(
      authCodeRepoStub,
      codeGeneratorStub,
      tokenStorageStub
    )
  })

  group.each.teardown(() => {
    app.container.restore(OAuthAuthorizationCodeRepository)
    app.container.restore(CodeGeneratorService)
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
      clientId: 'test-client',
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 86400,
    } as OAuthClient

    const authCode = {
      codeHash: 'hashed-code',
      userId: 'user-123',
      isUsed: false,
      expiresAt: DateTime.now().plus({ minutes: 10 }),
      scopes: ['database:read', 'database:write'],
    } as unknown as OAuthAuthorizationCode

    const generatedTokens = {
      accessToken: 'generated-access-token',
      refreshToken: 'generated-refresh-token',
    }

    // Setup stubs
    authCodeRepoStub.findAndValidate.resolves(authCode)
    authCodeRepoStub.markAsUsed.resolves()
    codeGeneratorStub.generateTokenPair.returns(generatedTokens)
    tokenStorageStub.storeTokens.resolves({} as any)

    // Execute
    const result = await service.handle(params, client)

    // Verify response
    assert.equal(result.access_token, 'generated-access-token')
    assert.equal(result.token_type, 'Bearer')
    assert.equal(result.expires_in, 3600)
    assert.equal(result.refresh_token, 'generated-refresh-token')
    assert.equal(result.scope, 'database:read database:write')

    // Verify method calls
    assert.isTrue(
      authCodeRepoStub.findAndValidate.calledOnceWith(
        'valid-auth-code',
        'test-client',
        'https://client.app/callback'
      )
    )
    assert.isTrue(authCodeRepoStub.markAsUsed.calledOnceWith('hashed-code'))
    assert.isTrue(codeGeneratorStub.generateTokenPair.calledOnce)
    assert.isTrue(tokenStorageStub.storeTokens.calledOnce)

    // Verify token storage data
    const storageArgs = tokenStorageStub.storeTokens.firstCall.args[0]
    assert.equal(storageArgs.accessToken, 'generated-access-token')
    assert.equal(storageArgs.refreshToken, 'generated-refresh-token')
    assert.equal(storageArgs.clientId, 'test-client')
    assert.equal(storageArgs.userId, 'user-123')
    assert.deepEqual(storageArgs.scopes, ['database:read', 'database:write'])
    assert.equal(storageArgs.accessTokenLifetime, 3600)
    assert.equal(storageArgs.refreshTokenLifetime, 86400)
  })

  test('handle :: should throw error when code parameter is missing', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      redirect_uri: 'https://client.app/callback',
      // code is missing
    }

    const client = { clientId: 'test-client' } as OAuthClient

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_request')
      assert.include(error.message, 'Missing code or redirect_uri')
      assert.isFalse(authCodeRepoStub.findAndValidate.called)
    }
  })

  test('handle :: should throw error when redirect_uri parameter is missing', async ({
    assert,
  }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'valid-auth-code',
      // redirect_uri is missing
    }

    const client = { clientId: 'test-client' } as OAuthClient

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_request')
      assert.include(error.message, 'Missing code or redirect_uri')
      assert.isFalse(authCodeRepoStub.findAndValidate.called)
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

    const client = { clientId: 'test-client' } as OAuthClient

    // Setup stub to return null (code not found)
    authCodeRepoStub.findAndValidate.resolves(null)

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_grant')
      assert.include(error.message, 'Invalid authorization code')
      assert.isFalse(authCodeRepoStub.markAsUsed.called)
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

    const client = { clientId: 'test-client' } as OAuthClient

    const usedAuthCode = {
      codeHash: 'hashed-code',
      userId: 'user-123',
      isUsed: true, // Already used
      expiresAt: DateTime.now().plus({ minutes: 10 }),
      scopes: ['database:read'],
    } as unknown as OAuthAuthorizationCode

    authCodeRepoStub.findAndValidate.resolves(usedAuthCode)

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_grant')
      assert.include(error.message, 'Authorization code already used')
      assert.isFalse(authCodeRepoStub.markAsUsed.called)
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

    const client = { clientId: 'test-client' } as OAuthClient

    const expiredAuthCode = {
      codeHash: 'hashed-code',
      userId: 'user-123',
      isUsed: false,
      expiresAt: DateTime.now().minus({ minutes: 10 }), // Expired 10 minutes ago
      scopes: ['database:read'],
    } as unknown as OAuthAuthorizationCode

    authCodeRepoStub.findAndValidate.resolves(expiredAuthCode)

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_grant')
      assert.include(error.message, 'Authorization code expired')
      assert.isFalse(authCodeRepoStub.markAsUsed.called)
    }
  })

  test('handle :: should handle authorization code with empty scopes', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'valid-auth-code',
      redirect_uri: 'https://client.app/callback',
    }

    const client = {
      clientId: 'test-client',
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 86400,
    } as OAuthClient

    const authCode = {
      codeHash: 'hashed-code',
      userId: 'user-123',
      isUsed: false,
      expiresAt: DateTime.now().plus({ minutes: 10 }),
      scopes: [], // Empty scopes
    } as unknown as OAuthAuthorizationCode

    const generatedTokens = {
      accessToken: 'generated-access-token',
      refreshToken: 'generated-refresh-token',
    }

    authCodeRepoStub.findAndValidate.resolves(authCode)
    authCodeRepoStub.markAsUsed.resolves()
    codeGeneratorStub.generateTokenPair.returns(generatedTokens)
    tokenStorageStub.storeTokens.resolves({} as any)

    const result = await service.handle(params, client)

    assert.equal(result.scope, '') // Empty scope string

    // Verify token storage was called with empty scopes
    const storageArgs = tokenStorageStub.storeTokens.firstCall.args[0]
    assert.deepEqual(storageArgs.scopes, [])
  })

  test('handle :: should handle authorization code with null scopes', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'valid-auth-code',
      redirect_uri: 'https://client.app/callback',
    }

    const client = {
      clientId: 'test-client',
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 86400,
    } as OAuthClient

    const authCode = {
      codeHash: 'hashed-code',
      userId: 'user-123',
      isUsed: false,
      expiresAt: DateTime.now().plus({ minutes: 10 }),
      scopes: null, // Null scopes
    } as unknown as OAuthAuthorizationCode

    const generatedTokens = {
      accessToken: 'generated-access-token',
      refreshToken: 'generated-refresh-token',
    }

    authCodeRepoStub.findAndValidate.resolves(authCode)
    authCodeRepoStub.markAsUsed.resolves()
    codeGeneratorStub.generateTokenPair.returns(generatedTokens)
    tokenStorageStub.storeTokens.resolves({} as any)

    const result = await service.handle(params, client)

    assert.equal(result.scope, '') // Empty scope string for null scopes

    // Verify token storage was called with empty array for null scopes
    const storageArgs = tokenStorageStub.storeTokens.firstCall.args[0]
    assert.deepEqual(storageArgs.scopes, [])
  })
})
