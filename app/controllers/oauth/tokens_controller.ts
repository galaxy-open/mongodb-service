import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import OAuthTokenService from '#services/oauth_token_service'
import { tokenValidator } from '#validators/oauth_token'

@inject()
export default class OAuthTokenController {
  constructor(private tokenService: OAuthTokenService) {}

  /**
   * POST /oauth/token
   * Exchange authorization code for access token
   */
  async store({ request, response }: HttpContext) {
    const params = await request.validateUsing(tokenValidator)
    const result = await this.tokenService.exchangeToken(params)
    return response.json(result)
  }
}
