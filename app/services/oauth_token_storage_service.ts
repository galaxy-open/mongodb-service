import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import OAuthAccessTokenRepository from '#repositories/oauth_access_token_repository'
import OAuthRefreshTokenRepository from '#repositories/oauth_refresh_token_repository'
import OAuthAccessToken from '#models/oauth_access_token'
import OAuthRefreshToken from '#models/oauth_refresh_token'

export interface TokenStorageData {
  accessToken: string
  refreshToken: string
  clientId: string
  userId: string
  organizationId?: string | null
  scopes: string[]
  accessTokenLifetime: number
  refreshTokenLifetime: number
}

export interface StoredTokens {
  accessTokenRecord: OAuthAccessToken
  refreshTokenRecord: OAuthRefreshToken
}

@inject()
export default class OAuthTokenStorageService {
  constructor(
    private accessTokenRepository: OAuthAccessTokenRepository,
    private refreshTokenRepository: OAuthRefreshTokenRepository
  ) {}

  /**
   * Store access and refresh tokens
   */
  async storeTokens(data: TokenStorageData): Promise<StoredTokens> {
    const accessTokenExpiresAt = DateTime.now().plus({ seconds: data.accessTokenLifetime })
    const refreshTokenExpiresAt = DateTime.now().plus({ seconds: data.refreshTokenLifetime })

    // Store access token
    const accessTokenRecord = await this.accessTokenRepository.create({
      token: data.accessToken,
      clientId: data.clientId,
      userId: data.userId,
      organizationId: data.organizationId,
      scopes: data.scopes,
      isRevoked: false,
      expiresAt: accessTokenExpiresAt,
    })

    // Store refresh token
    const refreshTokenRecord = await this.refreshTokenRepository.create({
      token: data.refreshToken,
      clientId: data.clientId,
      userId: data.userId,
      organizationId: data.organizationId,
      accessTokenHash: accessTokenRecord.tokenHash,
      scopes: data.scopes,
      isRevoked: false,
      expiresAt: refreshTokenExpiresAt,
    })

    return { accessTokenRecord, refreshTokenRecord }
  }

  /**
   * Store a new access token and link it to existing refresh token
   */
  async storeAccessToken(data: {
    accessToken: string
    clientId: string
    userId: string
    organizationId?: string | null
    scopes: string[]
    accessTokenLifetime: number
  }): Promise<OAuthAccessToken> {
    const accessTokenExpiresAt = DateTime.now().plus({ seconds: data.accessTokenLifetime })

    return this.accessTokenRepository.create({
      token: data.accessToken,
      clientId: data.clientId,
      userId: data.userId,
      organizationId: data.organizationId,
      scopes: data.scopes,
      isRevoked: false,
      expiresAt: accessTokenExpiresAt,
    })
  }

  /**
   * Revoke an access token by its hash
   */
  async revokeAccessToken(tokenHash: string): Promise<void> {
    await this.accessTokenRepository.revoke(tokenHash)
  }

  /**
   * Update refresh token to point to new access token
   */
  async updateRefreshTokenAccessToken(
    refreshToken: OAuthRefreshToken,
    newAccessTokenHash: string
  ): Promise<void> {
    refreshToken.accessTokenHash = newAccessTokenHash
    await refreshToken.save()
  }
}
