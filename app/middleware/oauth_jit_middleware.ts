import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'
import OAuthJwtService from '#services/oauth_jwt_service'
import UserProvisioningService from '#services/user_provisioning_service'
import OrganizationProvisioningService from '#services/organization_provisioning_service'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class OAuthJitMiddleware {
  constructor(
    private oauthJwtService: OAuthJwtService,
    private userProvisioningService: UserProvisioningService,
    private organizationProvisioningService: OrganizationProvisioningService
  ) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const { request, auth } = ctx

    // Check if user is already authenticated via session
    try {
      await auth.check()
      if (auth.user) {
        return next()
      }
    } catch {
      // User not authenticated, continue with JIT check
    }

    // Handle JIT provisioning from id_token_hint (OAuth flow)
    const idTokenHint = request.qs().id_token_hint
    if (idTokenHint) {
      try {
        const jwtData = await this.oauthJwtService.verifyAndExtractUser(idTokenHint)

        // Provision user first
        const user = await this.userProvisioningService.provisionUser({
          email: jwtData.email,
          username: jwtData.username,
          externalIdpId: jwtData.external_idp_id,
          externalUserId: jwtData.external_user_id,
        })

        // Provision organization if organization data is present
        if (this.organizationProvisioningService.isValidOrganizationData(jwtData.organization)) {
          const orgResult = await this.organizationProvisioningService.provisionOrganizationAndUser(
            user,
            jwtData.organization!
          )

          // Store organization context in session for OAuth flow
          ctx.session.put('oauth_organization_id', orgResult.organization.id)
          ctx.session.put('oauth_organization_role', orgResult.userRole)
        }

        // Login the JIT provisioned user
        await auth.use('web').login(user)
        return next()
      } catch (error) {
        logger.error(
          { error: error.message, userEmail: request.qs().email },
          'OAuth JIT provisioning failed'
        )
      }
    }

    return next()
  }
}
