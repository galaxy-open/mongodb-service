import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import OAuthConsentService from '#services/oauth_consent_service'
import { consentValidator } from '#validators/oauth_consent'
import { OAuthParams } from '#validators/oauth_authorize'

@inject()
export default class OAuthConsentController {
  constructor(protected consentService: OAuthConsentService) {}

  /**
   * GET /oauth/consent
   * Handles the consent page for the OAuth 2.0 Authorization Code Flow.
   * User authentication is handled by middleware.
   */
  async show({ inertia, session, auth }: HttpContext) {
    const params = session.get('oauth_params') as OAuthParams

    if (!params) {
      return inertia.render('errors/oauth_error', {
        error: 'Invalid OAuth request',
        errorDescription: 'No OAuth parameters found in session',
      })
    }

    // User is guaranteed to be authenticated by middleware
    const result = await this.consentService.getConsentData(params, auth.user!)

    return inertia.render('oauth/consent', result)
  }

  /**
   * POST /oauth/consent
   * Handles consent approval/denial
   */
  async store({ request, response, session, auth }: HttpContext) {
    const { decision } = await request.validateUsing(consentValidator)
    const oauthParams = session.get('oauth_params') as OAuthParams
    const user = auth.user!

    if (!oauthParams) {
      return response
        .redirect()
        .withQs({
          error: 'consent_required',
          error_description: 'Missing OAuth parameters',
        })
        .toPath('/oauth/consent')
    }

    const result = await this.consentService.processConsentDecision(decision, oauthParams, user.id)

    // Handle session management based on decision
    if (result.shouldGrantConsent) {
      session.put('consent_granted', true)
    }

    // Only clear session AFTER we've successfully processed everything
    // and we're about to redirect to external URL
    if (result.shouldClearSession) {
      session.forget('oauth_params')
      session.forget('consent_granted')
    }

    return response.redirect(result.redirectUrl)
  }
}
