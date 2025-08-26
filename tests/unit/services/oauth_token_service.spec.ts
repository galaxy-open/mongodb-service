import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OAuthTokenService from '#services/oauth_token_service'
import OAuthClientValidatorService from '#services/oauth_client_validator_service'
import OAuthAuthorizationCodeGrantService from '#services/oauth_authorization_code_grant_service'
import OAuthRefreshTokenGrantService from '#services/oauth_refresh_token_grant_service'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import { OAuthTokenParams } from '#validators/oauth_token'
import OAuthClient from '#models/oauth_client'
import oauthScopesConfig from '#config/oauth_scopes'

test.group('OAuthTokenService | Unit', (group) => {
  let service: OAuthTokenService
  let clientValidatorStub: sinon.SinonStubbedInstance<OAuthClientValidatorService>
  let authCodeGrantStub: sinon.SinonStubbedInstance<OAuthAuthorizationCodeGrantService>
  let refreshTokenGrantStub: sinon.SinonStubbedInstance<OAuthRefreshTokenGrantService>

  const mockClient = {
    clientId: 'test-client',
    accessTokenLifetime: 3600,
    refreshTokenLifetime: 86400,
  } as OAuthClient

  const authCodeTokenResponse = {
    access_token: 'auth-code-access-token',
    token_type: 'Bearer' as const,
    expires_in: 3600,
    refresh_token: 'new-refresh-token',
    scope: `${Object.keys(oauthScopesConfig.scopes)[0]} ${Object.keys(oauthScopesConfig.scopes)[1]}`, // database:read database:write
  }

  const refreshTokenResponse = {
    access_token: 'refreshed-access-token',
    token_type: 'Bearer' as const,
    expires_in: 3600,
    scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
  }

  group.each.setup(() => {
    clientValidatorStub = sinon.createStubInstance(OAuthClientValidatorService)
    authCodeGrantStub = sinon.createStubInstance(OAuthAuthorizationCodeGrantService)
    refreshTokenGrantStub = sinon.createStubInstance(OAuthRefreshTokenGrantService)

    app.container.swap(OAuthClientValidatorService, () => clientValidatorStub as any)
    app.container.swap(OAuthAuthorizationCodeGrantService, () => authCodeGrantStub as any)
    app.container.swap(OAuthRefreshTokenGrantService, () => refreshTokenGrantStub as any)

    service = new OAuthTokenService(clientValidatorStub, authCodeGrantStub, refreshTokenGrantStub)

    // Default client validation success
    clientValidatorStub.validateCredentials.resolves(mockClient)
  })

  group.each.teardown(() => {
    app.container.restore(OAuthClientValidatorService)
    app.container.restore(OAuthAuthorizationCodeGrantService)
    app.container.restore(OAuthRefreshTokenGrantService)
    sinon.restore()
  })

  test('exchangeToken :: should delegate authorization_code grant to AuthorizationCodeGrantService', async ({
    assert,
  }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'valid-auth-code',
      redirect_uri: 'https://client.app/callback',
    }

    authCodeGrantStub.handle.resolves(authCodeTokenResponse)

    const result = await service.exchangeToken(params)

    // Verify client validation was called
    assert.isTrue(
      clientValidatorStub.validateCredentials.calledOnceWith('test-client', 'test-secret')
    )

    // Verify delegation to authorization code grant service
    assert.isTrue(authCodeGrantStub.handle.calledOnceWith(params, mockClient))

    // Verify refresh token grant service was NOT called
    assert.isFalse(refreshTokenGrantStub.handle.called)

    // Verify response
    assert.deepEqual(result, authCodeTokenResponse)
  })

  test('exchangeToken :: should delegate refresh_token grant to RefreshTokenGrantService', async ({
    assert,
  }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'valid-refresh-token',
    }

    refreshTokenGrantStub.handle.resolves(refreshTokenResponse)

    const result = await service.exchangeToken(params)

    // Verify client validation was called
    assert.isTrue(
      clientValidatorStub.validateCredentials.calledOnceWith('test-client', 'test-secret')
    )

    // Verify delegation to refresh token grant service
    assert.isTrue(refreshTokenGrantStub.handle.calledOnceWith(params, mockClient))

    // Verify authorization code grant service was NOT called
    assert.isFalse(authCodeGrantStub.handle.called)

    // Verify response
    assert.deepEqual(result, refreshTokenResponse)
  })

  test('exchangeToken :: should throw error for unsupported grant type', async ({ assert }) => {
    const params = {
      grant_type: 'client_credentials', // Unsupported grant type
      client_id: 'test-client',
      client_secret: 'test-secret',
    } as any

    try {
      await service.exchangeToken(params)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'unsupported_grant_type')
      assert.include(error.message, 'Invalid grant type')
    }

    // Verify client validation was still called
    assert.isTrue(
      clientValidatorStub.validateCredentials.calledOnceWith('test-client', 'test-secret')
    )

    // Verify neither grant service was called
    assert.isFalse(authCodeGrantStub.handle.called)
    assert.isFalse(refreshTokenGrantStub.handle.called)
  })

  test('exchangeToken :: should propagate client validation errors', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'invalid-client',
      client_secret: 'wrong-secret',
      code: 'valid-auth-code',
      redirect_uri: 'https://client.app/callback',
    }

    const clientError = new InvalidOAuthRequestException(
      'invalid_client',
      'Invalid client credentials'
    )
    clientValidatorStub.validateCredentials.rejects(clientError)

    try {
      await service.exchangeToken(params)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_client')
      assert.include(error.message, 'Invalid client credentials')
    }

    // Verify client validation was called
    assert.isTrue(
      clientValidatorStub.validateCredentials.calledOnceWith('invalid-client', 'wrong-secret')
    )

    // Verify neither grant service was called due to client validation failure
    assert.isFalse(authCodeGrantStub.handle.called)
    assert.isFalse(refreshTokenGrantStub.handle.called)
  })

  test('exchangeToken :: should propagate authorization code grant errors', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'expired-auth-code',
      redirect_uri: 'https://client.app/callback',
    }

    const grantError = new InvalidOAuthRequestException(
      'invalid_grant',
      'Authorization code expired'
    )
    authCodeGrantStub.handle.rejects(grantError)

    try {
      await service.exchangeToken(params)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_grant')
      assert.include(error.message, 'Authorization code expired')
    }

    // Verify both client validation and grant service were called
    assert.isTrue(clientValidatorStub.validateCredentials.calledOnce)
    assert.isTrue(authCodeGrantStub.handle.calledOnceWith(params, mockClient))
    assert.isFalse(refreshTokenGrantStub.handle.called)
  })

  test('exchangeToken :: should propagate refresh token grant errors', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'revoked-refresh-token',
    }

    const grantError = new InvalidOAuthRequestException('invalid_grant', 'Refresh token revoked')
    refreshTokenGrantStub.handle.rejects(grantError)

    try {
      await service.exchangeToken(params)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_grant')
      assert.include(error.message, 'Refresh token revoked')
    }

    // Verify both client validation and grant service were called
    assert.isTrue(clientValidatorStub.validateCredentials.calledOnce)
    assert.isTrue(refreshTokenGrantStub.handle.calledOnceWith(params, mockClient))
    assert.isFalse(authCodeGrantStub.handle.called)
  })

  test('exchangeToken :: should handle different client validation scenarios', async ({
    assert,
  }) => {
    // Test 1: Different client for authorization code
    const authParams: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'auth-client',
      client_secret: 'auth-secret',
      code: 'valid-auth-code',
      redirect_uri: 'https://auth.app/callback',
    }

    const authClient = { clientId: 'auth-client' } as OAuthClient
    clientValidatorStub.validateCredentials.resolves(authClient)
    authCodeGrantStub.handle.resolves(authCodeTokenResponse)

    const authResult = await service.exchangeToken(authParams)

    assert.isTrue(authCodeGrantStub.handle.calledOnceWith(authParams, authClient))
    assert.deepEqual(authResult, authCodeTokenResponse)

    // Reset stubs for second test
    clientValidatorStub.validateCredentials.resetHistory()
    authCodeGrantStub.handle.resetHistory()
    refreshTokenGrantStub.handle.resetHistory()

    // Test 2: Different client for refresh token
    const refreshParams: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'refresh-client',
      client_secret: 'refresh-secret',
      refresh_token: 'valid-refresh-token',
    }

    const refreshClient = { clientId: 'refresh-client' } as OAuthClient
    clientValidatorStub.validateCredentials.resolves(refreshClient)
    refreshTokenGrantStub.handle.resolves(refreshTokenResponse)

    const refreshResult = await service.exchangeToken(refreshParams)

    assert.isTrue(
      clientValidatorStub.validateCredentials.calledOnceWith('refresh-client', 'refresh-secret')
    )
    assert.isTrue(refreshTokenGrantStub.handle.calledOnceWith(refreshParams, refreshClient))
    assert.deepEqual(refreshResult, refreshTokenResponse)
  })

  test('exchangeToken :: should handle Strategy pattern correctly with different responses', async ({
    assert,
  }) => {
    // Test authorization code grant with minimal response
    const minimalAuthResponse = {
      access_token: 'minimal-token',
      token_type: 'Bearer' as const,
      expires_in: 1800,
    }

    const authParams: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'minimal-code',
      redirect_uri: 'https://client.app/callback',
    }

    authCodeGrantStub.handle.resolves(minimalAuthResponse)

    const authResult = await service.exchangeToken(authParams)
    assert.deepEqual(authResult, minimalAuthResponse)

    // Reset and test refresh token grant with different response
    clientValidatorStub.validateCredentials.resetHistory()
    authCodeGrantStub.handle.resetHistory()

    const scopedRefreshResponse = {
      access_token: 'scoped-refresh-token',
      token_type: 'Bearer' as const,
      expires_in: 7200,
      scope: `${Object.keys(oauthScopesConfig.scopes)[0]} ${Object.keys(oauthScopesConfig.scopes)[2]}`, // database:read database:admin
    }

    const refreshParams: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'scoped-refresh-token',
      scope: `${Object.keys(oauthScopesConfig.scopes)[0]} ${Object.keys(oauthScopesConfig.scopes)[2]}`, // database:read database:admin
    }

    refreshTokenGrantStub.handle.resolves(scopedRefreshResponse)

    const refreshResult = await service.exchangeToken(refreshParams)
    assert.deepEqual(refreshResult, scopedRefreshResponse)

    // Verify proper delegation occurred
    assert.isTrue(refreshTokenGrantStub.handle.calledWith(refreshParams, mockClient))
    assert.isFalse(authCodeGrantStub.handle.called) // Should not be called in second test
  })

  test('exchangeToken :: should handle unexpected service errors', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'authorization_code',
      client_id: 'test-client',
      client_secret: 'test-secret',
      code: 'valid-auth-code',
      redirect_uri: 'https://client.app/callback',
    }

    const unexpectedError = new Error('Database connection failed')
    authCodeGrantStub.handle.rejects(unexpectedError)

    try {
      await service.exchangeToken(params)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database connection failed')
      assert.notInstanceOf(error, InvalidOAuthRequestException)
    }

    // Verify proper delegation still occurred
    assert.isTrue(clientValidatorStub.validateCredentials.calledOnce)
    assert.isTrue(authCodeGrantStub.handle.calledOnceWith(params, mockClient))
  })
})
