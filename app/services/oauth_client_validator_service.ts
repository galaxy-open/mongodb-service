import { inject } from '@adonisjs/core'
import OAuthClientRepository from '#repositories/oauth_client_repository'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import OAuthClient from '#models/oauth_client'
import { OAuthParams } from '#validators/oauth_authorize'

@inject()
export default class OAuthClientValidatorService {
  constructor(protected clientRepository: OAuthClientRepository) {}

  /**
   * Validates the client_id and redirect_uri from the OAuth parameters.
   *
   * @throws {InvalidOAuthRequestException} If the client is not found or the redirect URI is invalid.
   * @returns The validated OAuthClient instance.
   */
  async validate(params: OAuthParams): Promise<OAuthClient> {
    const client = await this.clientRepository.findById(params.client_id)
    if (!client) {
      throw new InvalidOAuthRequestException('invalid_client', 'Invalid client_id')
    }

    if (!client.redirectUris.includes(params.redirect_uri)) {
      // As per OAuth 2.0 spec, do not hint to the attacker what was wrong.
      throw new InvalidOAuthRequestException('invalid_request', 'Invalid client or redirect_uri')
    }

    return client
  }

  /**
   * Validates client credentials for token endpoint
   *
   * @throws {InvalidOAuthRequestException} If the client credentials are invalid
   * @returns The validated OAuthClient instance
   */
  async validateCredentials(clientId: string, clientSecret: string): Promise<OAuthClient> {
    const client = await this.clientRepository.verifyCredentials(clientId, clientSecret)

    if (!client) {
      throw new InvalidOAuthRequestException('invalid_client', 'Invalid client credentials')
    }

    if (!client.isConfidential) {
      throw new InvalidOAuthRequestException(
        'unauthorized_client',
        'Public clients are not supported for this grant type'
      )
    }

    return client
  }
}
