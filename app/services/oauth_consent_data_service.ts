import { inject } from '@adonisjs/core'
import { OAuthParams } from '#validators/oauth_authorize'
import OAuthClientValidatorService from '#services/oauth_client_validator_service'
import { formatScopes, parseScopes } from '#config/oauth_scopes'
import type User from '#models/user'

export type ConsentData = {
  client: { name: string; id: string }
  scopes: { scope: string; description: string }[]
  user: { username: string; email: string }
}

@inject()
export default class OAuthConsentDataService {
  constructor(protected clientValidator: OAuthClientValidatorService) {}

  /**
   * Get the data needed for rendering the consent page
   * User is guaranteed to be authenticated by middleware
   */
  async getConsentData(params: OAuthParams, user: User): Promise<ConsentData> {
    const client = await this.clientValidator.validate(params)
    const scopes = parseScopes(params.scope)

    return {
      client: { name: client.clientName, id: params.client_id },
      scopes: formatScopes(scopes),
      user: { username: user.username, email: user.email },
    }
  }
}
