import { inject } from '@adonisjs/core'
import OAuthConsentRepository from '#repositories/oauth_consent_repository'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class OAuthConsentStorageService {
  constructor(protected consentRepository: OAuthConsentRepository) {}

  /**
   * Check if a user has already consented to the requested scopes for a client
   */
  async hasConsentForScopes(userId: string, clientId: string, scopes: string[]): Promise<boolean> {
    return await this.consentRepository.hasConsentForScopes(userId, clientId, scopes)
  }

  /**
   * Store user consent for a client with specific scopes
   */
  async storeConsent(
    userId: string,
    clientId: string,
    scopes: string[],
    expiresIn?: number
  ): Promise<void> {
    const expiresAt = expiresIn ? DateTime.now().plus({ seconds: expiresIn }) : null

    await this.consentRepository.createOrUpdate({
      userId,
      clientId,
      scopes,
      expiresAt,
    })

    logger.info(
      `Consent stored for user ${userId}, client ${clientId}, scopes: ${scopes.join(', ')}`
    )
  }

  /**
   * Revoke consent for a specific client
   */
  async revokeConsent(userId: string, clientId: string): Promise<void> {
    await this.consentRepository.revoke(userId, clientId)
    logger.info(`Consent revoked for user ${userId}, client ${clientId}`)
  }

  /**
   * Get all consents for a user
   */
  async getUserConsents(userId: string) {
    return this.consentRepository.findByUser(userId)
  }
}
