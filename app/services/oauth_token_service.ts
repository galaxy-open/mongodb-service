import { inject } from '@adonisjs/core'
import OAuthClientValidatorService from '#services/oauth_client_validator_service'
import OAuthAuthorizationCodeGrantService from '#services/oauth_authorization_code_grant_service'
import OAuthRefreshTokenGrantService from '#services/oauth_refresh_token_grant_service'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import { OAuthTokenParams } from '#validators/oauth_token'

export interface TokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token?: string
  scope?: string
}

@inject()
export default class OAuthTokenService {
  constructor(
    private clientValidator: OAuthClientValidatorService,
    private authCodeGrantService: OAuthAuthorizationCodeGrantService,
    private refreshTokenGrantService: OAuthRefreshTokenGrantService
  ) {}

  /**
   * Main method to exchange authorization code or refresh token for access token
   * Follows Strategy Pattern - delegates to appropriate grant handler
   */
  async exchangeToken(params: OAuthTokenParams): Promise<TokenResponse> {
    // Validate client credentials
    const client = await this.clientValidator.validateCredentials(
      params.client_id,
      params.client_secret
    )

    // Delegate to appropriate grant handler (Strategy Pattern)
    switch (params.grant_type) {
      case 'authorization_code':
        return this.authCodeGrantService.handle(params, client)
      case 'refresh_token':
        return this.refreshTokenGrantService.handle(params, client)
      default:
        throw new InvalidOAuthRequestException('unsupported_grant_type', 'Invalid grant type')
    }
  }
}
