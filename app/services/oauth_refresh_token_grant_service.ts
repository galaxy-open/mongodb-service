import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import OAuthRefreshTokenRepository from '#repositories/oauth_refresh_token_repository'
import OAuthTokenStorageService from '#services/oauth_token_storage_service'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import { OAuthTokenParams } from '#validators/oauth_token'
import { TokenResponse } from '#services/oauth_token_service'
import OAuthClient from '#models/oauth_client'

@inject()
export default class OAuthRefreshTokenGrantService {
  constructor(
    private refreshTokenRepository: OAuthRefreshTokenRepository,
    private tokenStorage: OAuthTokenStorageService
  ) {}

  /**
   * Handle refresh token grant
   */
  async handle(params: OAuthTokenParams, client: OAuthClient): Promise<TokenResponse> {
    if (!params.refresh_token) {
      throw new InvalidOAuthRequestException(
        'invalid_request',
        'Missing refresh_token for refresh_token grant'
      )
    }

    // Find and validate the refresh token
    const refreshTokenRecord = await this.refreshTokenRepository.findByToken(params.refresh_token)

    if (!refreshTokenRecord) {
      throw new InvalidOAuthRequestException('invalid_grant', 'Invalid refresh token')
    }

    // Verify client matches
    if (refreshTokenRecord.clientId !== client.id) {
      throw new InvalidOAuthRequestException('invalid_grant', 'Refresh token client mismatch')
    }

    // Check if refresh token is revoked
    if (refreshTokenRecord.isRevoked) {
      throw new InvalidOAuthRequestException('invalid_grant', 'Refresh token revoked')
    }

    // Check if refresh token has expired
    if (refreshTokenRecord.expiresAt && refreshTokenRecord.expiresAt < DateTime.now()) {
      throw new InvalidOAuthRequestException('invalid_grant', 'Refresh token expired')
    }

    // Determine scopes for new token
    let scopes = refreshTokenRecord.scopes || []
    if (params.scope) {
      const requestedScopes = params.scope.split(' ')
      // Only allow subset of original scopes
      scopes = requestedScopes.filter((scope) => scopes.includes(scope))
    }

    // Revoke old access token if it exists
    if (refreshTokenRecord.accessTokenId) {
      await this.tokenStorage.revokeAccessToken(refreshTokenRecord.accessTokenId)
    }

    // Store new access token
    const accessTokenRecord = await this.tokenStorage.storeAccessToken({
      clientId: client.id,
      userId: refreshTokenRecord.userId,
      organizationId: refreshTokenRecord.organizationId,
      scopes: scopes,
      accessTokenLifetime: client.accessTokenLifetime,
    })

    // Update refresh token to point to new access token
    await this.tokenStorage.updateRefreshTokenAccessToken(refreshTokenRecord, accessTokenRecord.id)

    logger.info(`Access token refreshed for user ${refreshTokenRecord.userId}, client ${client.id}`)

    return {
      access_token: accessTokenRecord.id,
      token_type: 'Bearer',
      expires_in: client.accessTokenLifetime,
      scope: scopes.join(' '),
    }
  }
}
