import { test } from '@japa/runner'
import sinon from 'sinon'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import OAuthTokenStorageService from '#services/oauth_token_storage_service'
import OAuthAccessTokenRepository from '#repositories/oauth_access_token_repository'
import OAuthRefreshTokenRepository from '#repositories/oauth_refresh_token_repository'
import OAuthAccessToken from '#models/oauth_access_token'
import OAuthRefreshToken from '#models/oauth_refresh_token'
import { TokenStorageData } from '#services/oauth_token_storage_service'

test.group('OAuthTokenStorageService | Unit', (group) => {
  let service: OAuthTokenStorageService
  let accessTokenRepoStub: sinon.SinonStubbedInstance<OAuthAccessTokenRepository>
  let refreshTokenRepoStub: sinon.SinonStubbedInstance<OAuthRefreshTokenRepository>
  let clock: sinon.SinonFakeTimers

  const mockDateTime = DateTime.fromISO('2024-01-15T10:00:00.000Z')

  group.each.setup(() => {
    // Create fake timers to control DateTime.now()
    clock = sinon.useFakeTimers(mockDateTime.toJSDate())

    accessTokenRepoStub = sinon.createStubInstance(OAuthAccessTokenRepository)
    refreshTokenRepoStub = sinon.createStubInstance(OAuthRefreshTokenRepository)

    app.container.swap(OAuthAccessTokenRepository, () => accessTokenRepoStub as any)
    app.container.swap(OAuthRefreshTokenRepository, () => refreshTokenRepoStub as any)

    service = new OAuthTokenStorageService(accessTokenRepoStub, refreshTokenRepoStub)
  })

  group.each.teardown(() => {
    clock.restore()
    app.container.restore(OAuthAccessTokenRepository)
    app.container.restore(OAuthRefreshTokenRepository)
    sinon.restore()
  })

  test('storeTokens :: should store both access and refresh tokens', async ({ assert }) => {
    const tokenData: TokenStorageData = {
      accessToken: 'generated-access-token',
      refreshToken: 'generated-refresh-token',
      clientId: 'test-client',
      userId: 'user-123',
      scopes: ['database:read', 'database:write'],
      accessTokenLifetime: 3600, // 1 hour
      refreshTokenLifetime: 86400, // 24 hours
    }

    const mockAccessToken = {
      tokenHash: 'access-token-hash',
      token: 'generated-access-token',
      clientId: 'test-client',
      userId: 'user-123',
      scopes: ['database:read', 'database:write'],
      isRevoked: false,
      expiresAt: mockDateTime.plus({ seconds: 3600 }),
    } as unknown as OAuthAccessToken

    const mockRefreshToken = {
      tokenHash: 'refresh-token-hash',
      token: 'generated-refresh-token',
      clientId: 'test-client',
      userId: 'user-123',
      accessTokenHash: 'access-token-hash',
      scopes: ['database:read', 'database:write'],
      isRevoked: false,
      expiresAt: mockDateTime.plus({ seconds: 86400 }),
    } as unknown as OAuthRefreshToken

    // Setup stubs
    accessTokenRepoStub.create.resolves(mockAccessToken)
    refreshTokenRepoStub.create.resolves(mockRefreshToken)

    // Execute
    const result = await service.storeTokens(tokenData)

    // Verify access token creation
    assert.isTrue(accessTokenRepoStub.create.calledOnce)
    const accessTokenArgs = accessTokenRepoStub.create.firstCall.args[0]
    assert.equal(accessTokenArgs.token, 'generated-access-token')
    assert.equal(accessTokenArgs.clientId, 'test-client')
    assert.equal(accessTokenArgs.userId, 'user-123')
    assert.deepEqual(accessTokenArgs.scopes, ['database:read', 'database:write'])
    assert.isFalse(accessTokenArgs.isRevoked)
    assert.isTrue(accessTokenArgs.expiresAt!.equals(mockDateTime.plus({ seconds: 3600 })))

    // Verify refresh token creation
    assert.isTrue(refreshTokenRepoStub.create.calledOnce)
    const refreshTokenArgs = refreshTokenRepoStub.create.firstCall.args[0]
    assert.equal(refreshTokenArgs.token, 'generated-refresh-token')
    assert.equal(refreshTokenArgs.clientId, 'test-client')
    assert.equal(refreshTokenArgs.userId, 'user-123')
    assert.equal(refreshTokenArgs.accessTokenHash, 'access-token-hash')
    assert.deepEqual(refreshTokenArgs.scopes, ['database:read', 'database:write'])
    assert.isFalse(refreshTokenArgs.isRevoked)
    assert.isTrue(refreshTokenArgs.expiresAt!.equals(mockDateTime.plus({ seconds: 86400 })))

    // Verify result
    assert.equal(result.accessTokenRecord, mockAccessToken)
    assert.equal(result.refreshTokenRecord, mockRefreshToken)
  })

  test('storeTokens :: should handle empty scopes', async ({ assert }) => {
    const tokenData: TokenStorageData = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      clientId: 'test-client',
      userId: 'user-123',
      scopes: [], // Empty scopes
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 86400,
    }

    const mockAccessToken = {
      tokenHash: 'access-token-hash',
      scopes: [],
    } as unknown as OAuthAccessToken

    const mockRefreshToken = {
      tokenHash: 'refresh-token-hash',
      scopes: [],
    } as unknown as OAuthRefreshToken

    accessTokenRepoStub.create.resolves(mockAccessToken)
    refreshTokenRepoStub.create.resolves(mockRefreshToken)

    const result = await service.storeTokens(tokenData)

    // Verify empty scopes are handled
    const accessTokenArgs = accessTokenRepoStub.create.firstCall.args[0]
    const refreshTokenArgs = refreshTokenRepoStub.create.firstCall.args[0]

    assert.deepEqual(accessTokenArgs.scopes, [])
    assert.deepEqual(refreshTokenArgs.scopes, [])
    assert.equal(result.accessTokenRecord, mockAccessToken)
    assert.equal(result.refreshTokenRecord, mockRefreshToken)
  })

  test('storeTokens :: should handle different token lifetimes', async ({ assert }) => {
    const tokenData: TokenStorageData = {
      accessToken: 'short-lived-token',
      refreshToken: 'long-lived-token',
      clientId: 'test-client',
      userId: 'user-123',
      scopes: ['database:read'],
      accessTokenLifetime: 300, // 5 minutes
      refreshTokenLifetime: 604800, // 7 days
    }

    const mockAccessToken = { tokenHash: 'hash1' } as unknown as OAuthAccessToken
    const mockRefreshToken = { tokenHash: 'hash2' } as unknown as OAuthRefreshToken

    accessTokenRepoStub.create.resolves(mockAccessToken)
    refreshTokenRepoStub.create.resolves(mockRefreshToken)

    await service.storeTokens(tokenData)

    // Verify different expiration times
    const accessTokenArgs = accessTokenRepoStub.create.firstCall.args[0]
    const refreshTokenArgs = refreshTokenRepoStub.create.firstCall.args[0]

    assert.isTrue(accessTokenArgs.expiresAt!.equals(mockDateTime.plus({ seconds: 300 })))
    assert.isTrue(refreshTokenArgs.expiresAt!.equals(mockDateTime.plus({ seconds: 604800 })))
  })

  test('storeAccessToken :: should store a single access token', async ({ assert }) => {
    const tokenData = {
      accessToken: 'new-access-token',
      clientId: 'test-client',
      userId: 'user-123',
      scopes: ['database:read', 'database:admin'],
      accessTokenLifetime: 7200, // 2 hours
    }

    const mockAccessToken = {
      tokenHash: 'new-access-token-hash',
      token: 'new-access-token',
      clientId: 'test-client',
      userId: 'user-123',
      scopes: ['database:read', 'database:admin'],
      isRevoked: false,
      expiresAt: mockDateTime.plus({ seconds: 7200 }),
    } as unknown as OAuthAccessToken

    accessTokenRepoStub.create.resolves(mockAccessToken)

    const result = await service.storeAccessToken(tokenData)

    // Verify access token creation
    assert.isTrue(accessTokenRepoStub.create.calledOnce)
    const accessTokenArgs = accessTokenRepoStub.create.firstCall.args[0]
    assert.equal(accessTokenArgs.token, 'new-access-token')
    assert.equal(accessTokenArgs.clientId, 'test-client')
    assert.equal(accessTokenArgs.userId, 'user-123')
    assert.deepEqual(accessTokenArgs.scopes, ['database:read', 'database:admin'])
    assert.isFalse(accessTokenArgs.isRevoked)
    assert.isTrue(accessTokenArgs.expiresAt!.equals(mockDateTime.plus({ seconds: 7200 })))

    // Verify refresh token repository was NOT called
    assert.isFalse(refreshTokenRepoStub.create.called)

    // Verify result
    assert.equal(result, mockAccessToken)
  })

  test('storeAccessToken :: should handle minimal scopes', async ({ assert }) => {
    const tokenData = {
      accessToken: 'minimal-token',
      clientId: 'minimal-client',
      userId: 'user-456',
      scopes: ['basic'],
      accessTokenLifetime: 1800,
    }

    const mockAccessToken = {
      tokenHash: 'minimal-hash',
      scopes: ['basic'],
    } as unknown as OAuthAccessToken

    accessTokenRepoStub.create.resolves(mockAccessToken)

    const result = await service.storeAccessToken(tokenData)

    const accessTokenArgs = accessTokenRepoStub.create.firstCall.args[0]
    assert.deepEqual(accessTokenArgs.scopes, ['basic'])
    assert.equal(result, mockAccessToken)
  })

  test('revokeAccessToken :: should revoke access token by hash', async ({ assert }) => {
    const tokenHash = 'access-token-hash-to-revoke'

    accessTokenRepoStub.revoke.resolves()

    await service.revokeAccessToken(tokenHash)

    // Verify revocation was called with correct hash
    assert.isTrue(accessTokenRepoStub.revoke.calledOnceWith(tokenHash))

    // Verify refresh token repository was NOT called
    assert.isFalse(refreshTokenRepoStub.create.called)
  })

  test('updateRefreshTokenAccessToken :: should update refresh token with new access token hash', async ({
    assert,
  }) => {
    const mockRefreshToken = {
      accessTokenHash: 'old-access-token-hash',
      save: sinon.spy(),
    } as unknown as OAuthRefreshToken

    const newAccessTokenHash = 'new-access-token-hash'

    await service.updateRefreshTokenAccessToken(mockRefreshToken, newAccessTokenHash)

    // Verify refresh token was updated
    assert.equal(mockRefreshToken.accessTokenHash, newAccessTokenHash)

    // Verify save was called
    const saveSpy = mockRefreshToken.save as sinon.SinonSpy
    assert.isTrue(saveSpy.calledOnce)

    // Verify repositories were NOT called (direct model manipulation)
    assert.isFalse(accessTokenRepoStub.create.called)
    assert.isFalse(refreshTokenRepoStub.create.called)
  })

  test('storeTokens :: should handle repository errors gracefully', async ({ assert }) => {
    const tokenData: TokenStorageData = {
      accessToken: 'error-token',
      refreshToken: 'error-refresh',
      clientId: 'error-client',
      userId: 'error-user',
      scopes: ['error:scope'],
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 86400,
    }

    // Simulate access token creation failure
    const repoError = new Error('Database connection failed')
    accessTokenRepoStub.create.rejects(repoError)

    try {
      await service.storeTokens(tokenData)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database connection failed')
    }

    // Verify access token creation was attempted
    assert.isTrue(accessTokenRepoStub.create.calledOnce)

    // Verify refresh token creation was NOT attempted due to access token failure
    assert.isFalse(refreshTokenRepoStub.create.called)
  })

  test('storeTokens :: should handle refresh token creation failure', async ({ assert }) => {
    const tokenData: TokenStorageData = {
      accessToken: 'success-token',
      refreshToken: 'fail-refresh',
      clientId: 'test-client',
      userId: 'test-user',
      scopes: ['test:scope'],
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 86400,
    }

    const mockAccessToken = {
      tokenHash: 'success-hash',
    } as unknown as OAuthAccessToken

    // Access token succeeds, refresh token fails
    accessTokenRepoStub.create.resolves(mockAccessToken)
    const refreshError = new Error('Refresh token creation failed')
    refreshTokenRepoStub.create.rejects(refreshError)

    try {
      await service.storeTokens(tokenData)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Refresh token creation failed')
    }

    // Verify both operations were attempted
    assert.isTrue(accessTokenRepoStub.create.calledOnce)
    assert.isTrue(refreshTokenRepoStub.create.calledOnce)
  })

  test('revokeAccessToken :: should handle revocation errors', async ({ assert }) => {
    const tokenHash = 'problematic-hash'
    const revocationError = new Error('Token not found')

    accessTokenRepoStub.revoke.rejects(revocationError)

    try {
      await service.revokeAccessToken(tokenHash)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Token not found')
    }

    assert.isTrue(accessTokenRepoStub.revoke.calledOnceWith(tokenHash))
  })

  test('updateRefreshTokenAccessToken :: should handle save errors', async ({ assert }) => {
    const mockRefreshToken = {
      accessTokenHash: 'old-hash',
      save: sinon.stub().rejects(new Error('Save failed')),
    } as unknown as OAuthRefreshToken

    const newAccessTokenHash = 'new-hash'

    try {
      await service.updateRefreshTokenAccessToken(mockRefreshToken, newAccessTokenHash)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Save failed')
    }

    // Verify the hash was still updated before save failed
    assert.equal(mockRefreshToken.accessTokenHash, newAccessTokenHash)

    // Verify save was attempted
    const saveStub = mockRefreshToken.save as sinon.SinonStub
    assert.isTrue(saveStub.calledOnce)
  })
})
