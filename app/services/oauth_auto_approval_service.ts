import { inject } from '@adonisjs/core'
import OAuthAuthorizationCodeRepository from '#repositories/oauth_authorization_code_repository'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import type User from '#models/user'
import type OAuthClient from '#models/oauth_client'
import { OAuthParams } from '#validators/oauth_authorize'
import CodeGeneratorService from '#services/code_generator_service'

export interface AutoApprovalParams {
  user: User
  client: OAuthClient
  params: OAuthParams
  scopes: string[]
  organizationId?: string | null
}
@inject()
export default class OAuthAutoApprovalService {
  constructor(
    private authCodeRepository: OAuthAuthorizationCodeRepository,
    private codeGenerator: CodeGeneratorService
  ) {}

  /**
   * Auto-approve authorization, generate an authorization code, and return the final redirect URL.
   * @throws {Error} If code generation fails.
   */
  async approve({
    user,
    client,
    params,
    scopes,
    organizationId,
  }: AutoApprovalParams): Promise<string> {
    const code = this.codeGenerator.generateAuthorizationCode()
    const expiresAt = DateTime.now().plus({ minutes: 10 })

    await this.authCodeRepository.create({
      code, // The raw code repository will hash it
      clientId: client.clientId,
      userId: user.id,
      organizationId, // Include organization context
      redirectUri: params.redirect_uri,
      scopes: scopes,
      state: params.state,
      expiresAt,
      isUsed: false,
    })

    logger.info(`Authorization code generated for user ${user.id}, client ${client.clientId}`)

    return this.buildRedirectUrl(params.redirect_uri, {
      code,
      state: params.state,
    })
  }

  /**
   * Build the redirect URL with appropriate query parameters.
   */
  private buildRedirectUrl(baseUrl: string, params: Record<string, string | undefined>): string {
    const url = new URL(baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value)
      }
    })
    return url.toString()
  }
}
