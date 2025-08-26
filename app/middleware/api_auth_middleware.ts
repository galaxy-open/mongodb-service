import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'
import OAuthTokenValidationService from '#services/oauth_token_validation_service'
import OwnerRepository from '#repositories/owner_repository'
import ApiBouncerMiddleware from '#middleware/api_bouncer_middleware'
import { IhttpOwner } from '#interfaces/http_owner'

@inject()
export default class ApiAuthMiddleware {
  constructor(
    private oauthTokenValidationService: OAuthTokenValidationService,
    private ownerRepository: OwnerRepository,
    private apiBouncerMiddleware: ApiBouncerMiddleware
  ) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response } = ctx

    // Check for Bearer token (API authentication)
    const authHeader = request.header('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return response.unauthorized({ message: 'Bearer token required' })
    }

    const token = authHeader.substring(7)
    const tokenData = await this.oauthTokenValidationService.validateAccessToken(token)

    if (!tokenData?.user) {
      return response.unauthorized({ message: 'Invalid or expired token' })
    }

    // Find the owner for the token context
    const owner = await this.ownerRepository.findForTokenContext(tokenData)

    if (!owner) {
      return response.unauthorized({ message: 'Invalid token context' })
    }

    ctx.owner = {
      id: owner.id,
      username: owner.username!,
      userId: tokenData?.user.id,
      scopes: tokenData.scopes,
    }

    return this.apiBouncerMiddleware.handle(ctx, next)
  }
}

// Extend HttpContext with clean token context

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    owner: IhttpOwner
  }
}
