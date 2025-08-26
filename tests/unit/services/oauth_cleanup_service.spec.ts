import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import sinon from 'sinon'
import OAuthCleanupService from '#services/oauth_cleanup_service'
import OAuthAuthorizationCodeRepository from '#repositories/oauth_authorization_code_repository'
import OAuthAccessTokenRepository from '#repositories/oauth_access_token_repository'
import OAuthRefreshTokenRepository from '#repositories/oauth_refresh_token_repository'
import OAuthConsentRepository from '#repositories/oauth_consent_repository'

test.group('OAuthCleanupService | Unit', (group) => {
  let service: OAuthCleanupService
  let authCodeRepoStub: sinon.SinonStubbedInstance<OAuthAuthorizationCodeRepository>
  let accessTokenRepoStub: sinon.SinonStubbedInstance<OAuthAccessTokenRepository>
  let refreshTokenRepoStub: sinon.SinonStubbedInstance<OAuthRefreshTokenRepository>
  let consentRepoStub: sinon.SinonStubbedInstance<OAuthConsentRepository>

  group.each.setup(async () => {
    authCodeRepoStub = sinon.createStubInstance(OAuthAuthorizationCodeRepository)
    accessTokenRepoStub = sinon.createStubInstance(OAuthAccessTokenRepository)
    refreshTokenRepoStub = sinon.createStubInstance(OAuthRefreshTokenRepository)
    consentRepoStub = sinon.createStubInstance(OAuthConsentRepository)
    app.container.swap(OAuthAuthorizationCodeRepository, () => authCodeRepoStub as any)
    app.container.swap(OAuthAccessTokenRepository, () => accessTokenRepoStub as any)
    app.container.swap(OAuthRefreshTokenRepository, () => refreshTokenRepoStub as any)
    app.container.swap(OAuthConsentRepository, () => consentRepoStub as any)
    service = await app.container.make(OAuthCleanupService)
  })

  group.each.teardown(() => {
    app.container.restore(OAuthAuthorizationCodeRepository)
    app.container.restore(OAuthAccessTokenRepository)
    app.container.restore(OAuthRefreshTokenRepository)
    app.container.restore(OAuthConsentRepository)
    sinon.restore()
  })

  test('cleanupExpiredTokens :: should call deleteExpired on all repositories', async ({
    assert,
  }) => {
    // Arrange: Set up our stubs to return dummy numbers for deleted items
    authCodeRepoStub.deleteExpired.resolves(5)
    accessTokenRepoStub.deleteExpired.resolves(10)
    refreshTokenRepoStub.deleteExpired.resolves(15)
    consentRepoStub.deleteExpired.resolves(20)
    // Act: Call the method we want to test
    await service.cleanupExpiredTokens()

    // Assert: Verify that the `deleteExpired` method was called exactly once on each repository
    assert.isTrue(authCodeRepoStub.deleteExpired.calledOnce, 'Should delete expired auth codes')
    assert.isTrue(
      accessTokenRepoStub.deleteExpired.calledOnce,
      'Should delete expired access tokens'
    )
    assert.isTrue(
      refreshTokenRepoStub.deleteExpired.calledOnce,
      'Should delete expired refresh tokens'
    )
    assert.isTrue(consentRepoStub.deleteExpired.calledOnce, 'Should delete expired consents')
  })

  test('cleanupExpiredTokens :: should re-throw error if a repository fails', async ({
    assert,
  }) => {
    // Arrange: Configure one of the stubs to simulate an error
    const dbError = new Error('Database connection lost')
    authCodeRepoStub.deleteExpired.rejects(dbError)

    // Act & Assert: Verify that the service correctly propagates the exception
    try {
      await service.cleanupExpiredTokens()
      assert.fail('Expected cleanupExpiredTokens to throw an error')
    } catch (error) {
      assert.deepEqual(error, dbError)
      // Ensure it doesn't continue to the next repository on failure
      assert.isFalse(accessTokenRepoStub.deleteExpired.called)
    }
  })
})
