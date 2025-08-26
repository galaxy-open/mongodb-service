import { inject } from '@adonisjs/core'
import { OAuthParams } from '#validators/oauth_authorize'
import OAuthConsentDataService, { ConsentData } from '#services/oauth_consent_data_service'
import OAuthConsentStorageService from '#services/oauth_consent_storage_service'
import OAuthConsentDecisionProcessorService, {
  ConsentDecisionResult,
} from '#services/oauth_consent_decision_processor_service'
import type User from '#models/user'

@inject()
export default class OAuthConsentService {
  constructor(
    protected consentDataService: OAuthConsentDataService,
    protected consentStorageService: OAuthConsentStorageService,
    protected decisionProcessorService: OAuthConsentDecisionProcessorService
  ) {}

  /**
   * Check if a user needs to give consent for a specific client and scope combination
   */
  async needsConsent(userId: string, clientId: string, scopes: string[]): Promise<boolean> {
    // Check database for previously granted consent
    return !(await this.consentStorageService.hasConsentForScopes(userId, clientId, scopes))
  }

  /**
   * Get data needed for rendering the consent page
   * User is guaranteed to be authenticated by middleware
   */
  async getConsentData(params: OAuthParams, user: User): Promise<ConsentData> {
    return this.consentDataService.getConsentData(params, user)
  }

  /**
   * Process the user's consent decision (approve/deny)
   */
  async processConsentDecision(
    decision: string,
    oauthParams: OAuthParams,
    userId: string
  ): Promise<ConsentDecisionResult> {
    return this.decisionProcessorService.processDecision(decision, oauthParams, userId)
  }

  /**
   * Get all consents for a user (for user management UI)
   */
  async getUserConsents(userId: string) {
    return this.consentStorageService.getUserConsents(userId)
  }

  /**
   * Revoke a user's consent for a specific client
   */
  async revokeConsent(userId: string, clientId: string): Promise<void> {
    await this.consentStorageService.revokeConsent(userId, clientId)
  }
}
