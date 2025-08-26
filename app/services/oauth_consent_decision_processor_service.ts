import { inject } from '@adonisjs/core'
import { OAuthParams } from '#validators/oauth_authorize'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import OAuthConsentStorageService from '#services/oauth_consent_storage_service'
import { parseScopes } from '#config/oauth_scopes'
import logger from '@adonisjs/core/services/logger'

export type ConsentDecisionResult = {
  redirectUrl: string
  shouldGrantConsent?: boolean
  shouldClearSession?: boolean
}

@inject()
export default class OAuthConsentDecisionProcessorService {
  constructor(protected consentStorageService: OAuthConsentStorageService) {}

  /**
   * Process the user's consent decision and determine the next action
   */
  async processDecision(
    decision: string,
    oauthParams: OAuthParams,
    userId: string
  ): Promise<ConsentDecisionResult> {
    if (!oauthParams || !userId) {
      throw new InvalidOAuthRequestException(
        'invalid_request',
        'No OAuth parameters or user provided'
      )
    }

    if (decision === 'approve') {
      return await this.handleApproval(oauthParams, userId)
    } else {
      return await this.handleDenial(oauthParams)
    }
  }

  /**
   * Handle the case where the user approved the consent
   */
  private async handleApproval(
    oauthParams: OAuthParams,
    userId: string
  ): Promise<ConsentDecisionResult> {
    const scopes = parseScopes(oauthParams.scope)

    // Store persistent consent (expires in 1 year)
    await this.consentStorageService.storeConsent(
      userId,
      oauthParams.client_id,
      scopes,
      365 * 24 * 60 * 60 // 1 year in seconds
    )

    // Build authorize URL to redirect back to authorization flow
    const authorizeUrl = this.buildAuthorizeUrl(oauthParams)

    logger.info(`User ${userId} approved consent for client ${oauthParams.client_id}`)
    return {
      redirectUrl: authorizeUrl,
      shouldGrantConsent: true,
    }
  }

  /**
   * Handle the case where the user denied the consent
   */
  private async handleDenial(oauthParams: OAuthParams): Promise<ConsentDecisionResult> {
    // Build error redirect URL for the client
    const redirectUrl = new URL(oauthParams.redirect_uri)
    redirectUrl.searchParams.set('error', 'access_denied')
    redirectUrl.searchParams.set('error_description', 'User denied the request')

    if (oauthParams.state) {
      redirectUrl.searchParams.set('state', oauthParams.state)
    }

    logger.info(`User denied consent for client ${oauthParams.client_id}`)
    return {
      redirectUrl: redirectUrl.toString(),
      shouldClearSession: true,
    }
  }

  /**
   * Build the URL for continuing the authorization flow
   */
  private buildAuthorizeUrl(oauthParams: OAuthParams): string {
    const params = new URLSearchParams()
    Object.entries(oauthParams).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    return `/oauth/authorize?${params.toString()}`
  }
}
