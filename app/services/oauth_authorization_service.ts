import { inject } from '@adonisjs/core'
import { OAuthParams } from '#validators/oauth_authorize'
import OAuthClientValidatorService from '#services/oauth_client_validator_service'
import OAuthAutoApprovalService from '#services/oauth_auto_approval_service'
import OAuthConsentService from '#services/oauth_consent_service'
import { parseScopes } from '#config/oauth_scopes'
import type User from '#models/user'

export interface AuthorizationResult {
  redirectUrl: string
  shouldClearSession?: boolean
}

export interface AuthorizationParams {
  params: OAuthParams
  user: User
  consentGranted: boolean
  organizationId?: string | null
}

@inject()
export default class OAuthAuthorizationService {
  constructor(
    protected clientValidator: OAuthClientValidatorService,
    protected autoApprovalService: OAuthAutoApprovalService,
    protected consentService: OAuthConsentService
  ) {}

  async authorize({
    consentGranted,
    params,
    user,
    organizationId,
  }: AuthorizationParams): Promise<AuthorizationResult> {
    const client = await this.clientValidator.validate(params)
    const scopes = parseScopes(params.scope)

    // Auto-approve for trusted clients
    if (client.isTrusted) {
      const redirectUrl = await this.autoApprovalService.approve({
        user,
        client,
        params,
        scopes,
        organizationId,
      })
      return { redirectUrl }
    }

    // Handle explicit consent grant
    if (consentGranted) {
      const redirectUrl = await this.autoApprovalService.approve({
        user,
        client,
        params,
        scopes,
        organizationId,
      })
      return { redirectUrl, shouldClearSession: true }
    }

    // Check if consent is needed
    const needsConsent = await this.consentService.needsConsent(user.id, client.clientId, scopes)
    if (!needsConsent) {
      const redirectUrl = await this.autoApprovalService.approve({
        user,
        client,
        params,
        scopes,
        organizationId,
      })
      return { redirectUrl }
    }

    return { redirectUrl: '/oauth/consent' }
  }
}
