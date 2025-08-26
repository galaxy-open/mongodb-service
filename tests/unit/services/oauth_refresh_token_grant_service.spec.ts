import { test } from '@japa/runner'
import sinon from 'sinon'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import OAuthRefreshTokenGrantService from '#services/oauth_refresh_token_grant_service'
import CodeGeneratorService from '#services/code_generator_service'
import OAuthTokenStorageService from '#services/oauth_token_storage_service'
import OAuthRefreshTokenRepository from '#repositories/oauth_refresh_token_repository'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import { OAuthTokenParams } from '#validators/oauth_token'
import OAuthClient from '#models/oauth_client'
import OAuthRefreshToken from '#models/oauth_refresh_token'
import OAuthAccessToken from '#models/oauth_access_token'

test.group('OAuthRefreshTokenGrantService | Unit', (group) => {
  let service: OAuthRefreshTokenGrantService
  let refreshTokenRepoStub: sinon.SinonStubbedInstance<OAuthRefreshTokenRepository>
  let codeGeneratorStub: sinon.SinonStubbedInstance<CodeGeneratorService>
  let tokenStorageStub: sinon.SinonStubbedInstance<OAuthTokenStorageService>

  group.each.setup(() => {
    refreshTokenRepoStub = sinon.createStubInstance(OAuthRefreshTokenRepository)
    codeGeneratorStub = sinon.createStubInstance(CodeGeneratorService)
    tokenStorageStub = sinon.createStubInstance(OAuthTokenStorageService)

    app.container.swap(OAuthRefreshTokenRepository, () => refreshTokenRepoStub as any)
    app.container.swap(CodeGeneratorService, () => codeGeneratorStub as any)
    app.container.swap(OAuthTokenStorageService, () => tokenStorageStub as any)

    service = new OAuthRefreshTokenGrantService(
      refreshTokenRepoStub,
      codeGeneratorStub,
      tokenStorageStub
    )
  })

  group.each.teardown(() => {
    app.container.restore(OAuthRefreshTokenRepository)
    app.container.restore(CodeGeneratorService)
    app.container.restore(OAuthTokenStorageService)
    sinon.restore()
  })

  test('handle :: should successfully refresh access token', async ({ assert }) => {
    // Setup test data
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'valid-refresh-token',
    }

    const client = {
      clientId: 'test-client',
      accessTokenLifetime: 3600,
    } as OAuthClient

    const refreshTokenRecord = {
      clientId: 'test-client',
      userId: 'user-123',
      isRevoked: false,
      expiresAt: DateTime.now().plus({ days: 30 }),
      scopes: ['database:read', 'database:write'],
      accessTokenHash: 'old-access-token-hash',
    } as unknown as OAuthRefreshToken

    const newAccessTokenRecord = {
      tokenHash: 'new-access-token-hash',
    } as unknown as OAuthAccessToken

    // Setup stubs
    refreshTokenRepoStub.findByToken.resolves(refreshTokenRecord)
    codeGeneratorStub.generateAccessToken.returns('new-access-token')
    tokenStorageStub.revokeAccessToken.resolves()
    tokenStorageStub.storeAccessToken.resolves(newAccessTokenRecord)
    tokenStorageStub.updateRefreshTokenAccessToken.resolves()

    // Execute
    const result = await service.handle(params, client)

    // Verify response
    assert.equal(result.access_token, 'new-access-token')
    assert.equal(result.token_type, 'Bearer')
    assert.equal(result.expires_in, 3600)
    assert.equal(result.scope, 'database:read database:write')
    assert.isUndefined(result.refresh_token) // Refresh token grants don't return new refresh token

    // Verify method calls
    assert.isTrue(refreshTokenRepoStub.findByToken.calledOnceWith('valid-refresh-token'))
    assert.isTrue(codeGeneratorStub.generateAccessToken.calledOnce)
    assert.isTrue(tokenStorageStub.revokeAccessToken.calledOnceWith('old-access-token-hash'))
    assert.isTrue(tokenStorageStub.storeAccessToken.calledOnce)
    assert.isTrue(
      tokenStorageStub.updateRefreshTokenAccessToken.calledOnceWith(
        refreshTokenRecord,
        'new-access-token-hash'
      )
    )

    // Verify access token storage data
    const storeAccessTokenArgs = tokenStorageStub.storeAccessToken.firstCall.args[0]
    assert.equal(storeAccessTokenArgs.accessToken, 'new-access-token')
    assert.equal(storeAccessTokenArgs.clientId, 'test-client')
    assert.equal(storeAccessTokenArgs.userId, 'user-123')
    assert.deepEqual(storeAccessTokenArgs.scopes, ['database:read', 'database:write'])
    assert.equal(storeAccessTokenArgs.accessTokenLifetime, 3600)
  })

  test('handle :: should throw error when refresh_token parameter is missing', async ({
    assert,
  }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      // refresh_token is missing
    }

    const client = { clientId: 'test-client' } as OAuthClient

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_request')
      assert.include(error.message, 'Missing refresh_token')
      assert.isFalse(refreshTokenRepoStub.findByToken.called)
    }
  })

  test('handle :: should throw error when refresh token is not found', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'invalid-refresh-token',
    }

    const client = { clientId: 'test-client' } as OAuthClient

    // Setup stub to return null (token not found)
    refreshTokenRepoStub.findByToken.resolves(null)

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_grant')
      assert.include(error.message, 'Invalid refresh token')
      assert.isFalse(tokenStorageStub.revokeAccessToken.called)
    }
  })

  test('handle :: should throw error when client mismatch', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'valid-refresh-token',
    }

    const client = { clientId: 'test-client' } as OAuthClient

    const refreshTokenRecord = {
      clientId: 'different-client', // Different client
      userId: 'user-123',
      isRevoked: false,
      expiresAt: DateTime.now().plus({ days: 30 }),
      scopes: ['database:read'],
    } as unknown as OAuthRefreshToken

    refreshTokenRepoStub.findByToken.resolves(refreshTokenRecord)

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_grant')
      assert.include(error.message, 'Refresh token client mismatch')
      assert.isFalse(tokenStorageStub.revokeAccessToken.called)
    }
  })

  test('handle :: should throw error when refresh token is revoked', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'revoked-refresh-token',
    }

    const client = { clientId: 'test-client' } as OAuthClient

    const revokedRefreshToken = {
      clientId: 'test-client',
      userId: 'user-123',
      isRevoked: true, // Revoked
      expiresAt: DateTime.now().plus({ days: 30 }),
      scopes: ['database:read'],
    } as unknown as OAuthRefreshToken

    refreshTokenRepoStub.findByToken.resolves(revokedRefreshToken)

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_grant')
      assert.include(error.message, 'Refresh token revoked')
      assert.isFalse(tokenStorageStub.revokeAccessToken.called)
    }
  })

  test('handle :: should throw error when refresh token is expired', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'expired-refresh-token',
    }

    const client = { clientId: 'test-client' } as OAuthClient

    const expiredRefreshToken = {
      clientId: 'test-client',
      userId: 'user-123',
      isRevoked: false,
      expiresAt: DateTime.now().minus({ days: 1 }), // Expired 1 day ago
      scopes: ['database:read'],
    } as unknown as OAuthRefreshToken

    refreshTokenRepoStub.findByToken.resolves(expiredRefreshToken)

    try {
      await service.handle(params, client)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.error, 'invalid_grant')
      assert.include(error.message, 'Refresh token expired')
      assert.isFalse(tokenStorageStub.revokeAccessToken.called)
    }
  })

  test('handle :: should handle refresh token with limited scope request', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'valid-refresh-token',
      scope: 'database:read', // Requesting subset of original scopes
    }

    const client = {
      clientId: 'test-client',
      accessTokenLifetime: 3600,
    } as OAuthClient

    const refreshTokenRecord = {
      clientId: 'test-client',
      userId: 'user-123',
      isRevoked: false,
      expiresAt: DateTime.now().plus({ days: 30 }),
      scopes: ['database:read', 'database:write'], // Original scopes
      accessTokenHash: 'old-access-token-hash',
    } as unknown as OAuthRefreshToken

    const newAccessTokenRecord = {
      tokenHash: 'new-access-token-hash',
    } as unknown as OAuthAccessToken

    refreshTokenRepoStub.findByToken.resolves(refreshTokenRecord)
    codeGeneratorStub.generateAccessToken.returns('new-access-token')
    tokenStorageStub.revokeAccessToken.resolves()
    tokenStorageStub.storeAccessToken.resolves(newAccessTokenRecord)
    tokenStorageStub.updateRefreshTokenAccessToken.resolves()

    const result = await service.handle(params, client)

    // Should only get the requested scope (subset)
    assert.equal(result.scope, 'database:read')

    // Verify access token storage with limited scopes
    const storeAccessTokenArgs = tokenStorageStub.storeAccessToken.firstCall.args[0]
    assert.deepEqual(storeAccessTokenArgs.scopes, ['database:read'])
  })

  test('handle :: should reject scope request that exceeds original scopes', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'valid-refresh-token',
      scope: 'database:read database:admin', // Requesting broader scope than original
    }

    const client = {
      clientId: 'test-client',
      accessTokenLifetime: 3600,
    } as OAuthClient

    const refreshTokenRecord = {
      clientId: 'test-client',
      userId: 'user-123',
      isRevoked: false,
      expiresAt: DateTime.now().plus({ days: 30 }),
      scopes: ['database:read'], // Only has read scope
      accessTokenHash: 'old-access-token-hash',
    } as unknown as OAuthRefreshToken

    const newAccessTokenRecord = {
      tokenHash: 'new-access-token-hash',
    } as unknown as OAuthAccessToken

    refreshTokenRepoStub.findByToken.resolves(refreshTokenRecord)
    codeGeneratorStub.generateAccessToken.returns('new-access-token')
    tokenStorageStub.revokeAccessToken.resolves()
    tokenStorageStub.storeAccessToken.resolves(newAccessTokenRecord)
    tokenStorageStub.updateRefreshTokenAccessToken.resolves()

    const result = await service.handle(params, client)

    // Should only get the intersection (only database:read)
    assert.equal(result.scope, 'database:read')

    // Verify access token storage with filtered scopes
    const storeAccessTokenArgs = tokenStorageStub.storeAccessToken.firstCall.args[0]
    assert.deepEqual(storeAccessTokenArgs.scopes, ['database:read'])
  })

  test('handle :: should handle refresh token without old access token', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'valid-refresh-token',
    }

    const client = {
      clientId: 'test-client',
      accessTokenLifetime: 3600,
    } as OAuthClient

    const refreshTokenRecord = {
      clientId: 'test-client',
      userId: 'user-123',
      isRevoked: false,
      expiresAt: DateTime.now().plus({ days: 30 }),
      scopes: ['database:read'],
      accessTokenHash: null, // No old access token
    } as unknown as OAuthRefreshToken

    const newAccessTokenRecord = {
      tokenHash: 'new-access-token-hash',
    } as unknown as OAuthAccessToken

    refreshTokenRepoStub.findByToken.resolves(refreshTokenRecord)
    codeGeneratorStub.generateAccessToken.returns('new-access-token')
    tokenStorageStub.storeAccessToken.resolves(newAccessTokenRecord)
    tokenStorageStub.updateRefreshTokenAccessToken.resolves()

    const result = await service.handle(params, client)

    assert.equal(result.access_token, 'new-access-token')

    // Should NOT try to revoke old access token since there isn't one
    assert.isFalse(tokenStorageStub.revokeAccessToken.called)

    // Should still store new access token
    assert.isTrue(tokenStorageStub.storeAccessToken.calledOnce)
    assert.isTrue(tokenStorageStub.updateRefreshTokenAccessToken.calledOnce)
  })

  test('handle :: should handle refresh token with empty scopes', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'valid-refresh-token',
    }

    const client = {
      clientId: 'test-client',
      accessTokenLifetime: 3600,
    } as OAuthClient

    const refreshTokenRecord = {
      clientId: 'test-client',
      userId: 'user-123',
      isRevoked: false,
      expiresAt: DateTime.now().plus({ days: 30 }),
      scopes: [], // Empty scopes
      accessTokenHash: 'old-access-token-hash',
    } as unknown as OAuthRefreshToken

    const newAccessTokenRecord = {
      tokenHash: 'new-access-token-hash',
    } as unknown as OAuthAccessToken

    refreshTokenRepoStub.findByToken.resolves(refreshTokenRecord)
    codeGeneratorStub.generateAccessToken.returns('new-access-token')
    tokenStorageStub.revokeAccessToken.resolves()
    tokenStorageStub.storeAccessToken.resolves(newAccessTokenRecord)
    tokenStorageStub.updateRefreshTokenAccessToken.resolves()

    const result = await service.handle(params, client)

    assert.equal(result.scope, '') // Empty scope string

    // Verify access token storage with empty scopes
    const storeAccessTokenArgs = tokenStorageStub.storeAccessToken.firstCall.args[0]
    assert.deepEqual(storeAccessTokenArgs.scopes, [])
  })

  test('handle :: should handle refresh token with null scopes', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'valid-refresh-token',
    }

    const client = {
      clientId: 'test-client',
      accessTokenLifetime: 3600,
    } as OAuthClient

    const refreshTokenRecord = {
      clientId: 'test-client',
      userId: 'user-123',
      isRevoked: false,
      expiresAt: DateTime.now().plus({ days: 30 }),
      scopes: null, // Null scopes
      accessTokenHash: 'old-access-token-hash',
    } as unknown as OAuthRefreshToken

    const newAccessTokenRecord = {
      tokenHash: 'new-access-token-hash',
    } as unknown as OAuthAccessToken

    refreshTokenRepoStub.findByToken.resolves(refreshTokenRecord)
    codeGeneratorStub.generateAccessToken.returns('new-access-token')
    tokenStorageStub.revokeAccessToken.resolves()
    tokenStorageStub.storeAccessToken.resolves(newAccessTokenRecord)
    tokenStorageStub.updateRefreshTokenAccessToken.resolves()

    const result = await service.handle(params, client)

    assert.equal(result.scope, '') // Empty scope string for null scopes

    // Verify access token storage with empty array for null scopes
    const storeAccessTokenArgs = tokenStorageStub.storeAccessToken.firstCall.args[0]
    assert.deepEqual(storeAccessTokenArgs.scopes, [])
  })

  test('handle :: should handle refresh token without expiration date', async ({ assert }) => {
    const params: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client',
      client_secret: 'test-secret',
      refresh_token: 'valid-refresh-token',
    }

    const client = {
      clientId: 'test-client',
      accessTokenLifetime: 3600,
    } as OAuthClient

    const refreshTokenRecord = {
      clientId: 'test-client',
      userId: 'user-123',
      isRevoked: false,
      expiresAt: null, // No expiration
      scopes: ['database:read'],
      accessTokenHash: 'old-access-token-hash',
    } as unknown as OAuthRefreshToken

    const newAccessTokenRecord = {
      tokenHash: 'new-access-token-hash',
    } as unknown as OAuthAccessToken

    refreshTokenRepoStub.findByToken.resolves(refreshTokenRecord)
    codeGeneratorStub.generateAccessToken.returns('new-access-token')
    tokenStorageStub.revokeAccessToken.resolves()
    tokenStorageStub.storeAccessToken.resolves(newAccessTokenRecord)
    tokenStorageStub.updateRefreshTokenAccessToken.resolves()

    const result = await service.handle(params, client)

    // Should succeed since no expiration means it never expires
    assert.equal(result.access_token, 'new-access-token')
    assert.equal(result.token_type, 'Bearer')
    assert.equal(result.expires_in, 3600)
    assert.equal(result.scope, 'database:read')
  })
})
