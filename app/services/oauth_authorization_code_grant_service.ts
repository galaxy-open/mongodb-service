import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import OAuthAuthorizationCodeRepository from '#repositories/oauth_authorization_code_repository'
import CodeGeneratorService from '#services/code_generator_service'
import OAuthTokenStorageService from '#services/oauth_token_storage_service'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import { OAuthTokenParams } from '#validators/oauth_token'
import { TokenResponse } from '#services/oauth_token_service'
import OAuthClient from '#models/oauth_client'

@inject()
export default class OAuthAuthorizationCodeGrantService {
  constructor(
    private authCodeRepository: OAuthAuthorizationCodeRepository,
    private codeGenerator: CodeGeneratorService,
    private tokenStorage: OAuthTokenStorageService
  ) {}

  /**
   * Handle authorization code grant
   */
  async handle(params: OAuthTokenParams, client: OAuthClient): Promise<TokenResponse> {
    if (!params.code || !params.redirect_uri) {
      throw new InvalidOAuthRequestException(
        'invalid_request',
        'Missing code or redirect_uri for authorization_code grant'
      )
    }

    // Find and validate the authorization code
    const authCode = await this.authCodeRepository.findAndValidate(
      params.code,
      client.clientId,
      params.redirect_uri
    )

    if (!authCode) {
      throw new InvalidOAuthRequestException(
        'invalid_grant',
        'Invalid authorization code, client_id, or redirect_uri'
      )
    }

    // Check if code is already used
    if (authCode.isUsed) {
      throw new InvalidOAuthRequestException('invalid_grant', 'Authorization code already used')
    }

    // Check if code has expired
    if (authCode.expiresAt < DateTime.now()) {
      throw new InvalidOAuthRequestException('invalid_grant', 'Authorization code expired')
    }

    // Mark the authorization code as used
    await this.authCodeRepository.markAsUsed(authCode.codeHash)

    // Generate tokens
    const { accessToken, refreshToken } = this.codeGenerator.generateTokenPair()
    const scopes = authCode.scopes || []

    // Store tokens
    await this.tokenStorage.storeTokens({
      accessToken,
      refreshToken,
      clientId: client.clientId,
      userId: authCode.userId,
      organizationId: authCode.organizationId,
      scopes,
      accessTokenLifetime: client.accessTokenLifetime,
      refreshTokenLifetime: client.refreshTokenLifetime,
    })

    logger.info(`Access token created for user ${authCode.userId}, client ${client.clientId}`)

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: client.accessTokenLifetime,
      refresh_token: refreshToken,
      scope: scopes.join(' '),
    }
  }
}
