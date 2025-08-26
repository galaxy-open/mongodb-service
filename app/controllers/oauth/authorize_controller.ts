import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { authorizeValidator } from '#validators/oauth_authorize'
import OAuthAuthorizationService from '#services/oauth_authorization_service'

@inject()
export default class OAuthAuthorizeController {
  constructor(private oauthAuthorizationService: OAuthAuthorizationService) {}

  /**
   * GET /oauth/authorize
   * Handles the OAuth 2.0 Authorization Code Flow.
   * User authentication and JIT provisioning is handled by middleware.
   */
  async show({ request, response, session, auth }: HttpContext) {
    const params = await request.validateUsing(authorizeValidator)

    session.put('oauth_params', params)
    const consentGranted = session.get('consent_granted', false)
    const organizationId = session.get('oauth_organization_id', null)

    // User is guaranteed to be authenticated by middleware
    const result = await this.oauthAuthorizationService.authorize({
      params,
      user: auth.user!,
      consentGranted,
      organizationId,
    })

    if (result.shouldClearSession) {
      session.forget('consent_granted')
      session.forget('oauth_params')
    }

    return response.redirect(result.redirectUrl)
  }
}
