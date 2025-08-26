import { inject } from '@adonisjs/core'
import OAuthAccessTokenRepository from '#repositories/oauth_access_token_repository'
import type User from '#models/user'
import type Organization from '#models/organization'

@inject()
export default class OAuthTokenValidationService {
  constructor(private accessTokenRepository: OAuthAccessTokenRepository) {}

  /**
   * Validates a Bearer access token and returns the associated user with organization context
   */
  async validateAccessToken(
    token: string
  ): Promise<{ user: User; organization?: Organization; scopes: string[] } | null> {
    try {
      const accessTokenRecord = await this.accessTokenRepository.findByTokenWithRelations(token)

      if (!accessTokenRecord || accessTokenRecord.isRevoked) {
        return null
      }

      // Return the user, organization, and scopes from the token
      return {
        user: accessTokenRecord.user!,
        organization: accessTokenRecord.organization || undefined,
        scopes: accessTokenRecord.scopes || [],
      }
    } catch (error) {
      return null
    }
  }
}
