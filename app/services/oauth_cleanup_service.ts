import { inject } from '@adonisjs/core'
import OAuthAuthorizationCodeRepository from '#repositories/oauth_authorization_code_repository'
import OAuthAccessTokenRepository from '#repositories/oauth_access_token_repository'
import OAuthRefreshTokenRepository from '#repositories/oauth_refresh_token_repository'
import OAuthConsentRepository from '#repositories/oauth_consent_repository'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class OAuthCleanupService {
  constructor(
    private authCodeRepository: OAuthAuthorizationCodeRepository,
    private accessTokenRepository: OAuthAccessTokenRepository,
    private refreshTokenRepository: OAuthRefreshTokenRepository,
    private consentRepository: OAuthConsentRepository
  ) {}

  /**
   * Clean up expired OAuth tokens, authorization codes, and consents
   * Should be run periodically using scheduler
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const expiredCodes = await this.authCodeRepository.deleteExpired()
      logger.info(`Cleaned up ${expiredCodes} expired authorization codes`)

      const expiredAccessTokens = await this.accessTokenRepository.deleteExpired()
      logger.info(`Cleaned up ${expiredAccessTokens} expired access tokens`)

      const expiredRefreshTokens = await this.refreshTokenRepository.deleteExpired()
      logger.info(`Cleaned up ${expiredRefreshTokens} expired refresh tokens`)

      const expiredConsents = await this.consentRepository.deleteExpired()
      logger.info(`Cleaned up ${expiredConsents} expired consents`)
    } catch (error) {
      logger.error({ error }, 'Failed to cleanup expired OAuth tokens:')
      throw error
    }
  }
}
