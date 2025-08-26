import { inject } from '@adonisjs/core'
import TrustedIdentityProviderRepository from '#repositories/trusted_identity_provider_repository'
import logger from '@adonisjs/core/services/logger'
import TrustedIdentityProvider from '#models/trusted_identity_provider'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import JwtWrapperService, { JWTPayloadType } from '#services/jwt_wrapper_service'

export type JWTOrganizationData = {
  username: string
}

export type JWTUserData = {
  email: string
  username: string
  external_idp_id: string
  external_user_id: string
  organization?: JWTOrganizationData
}

@inject()
export default class OAuthJwtService {
  constructor(
    private trustedProviderRepository: TrustedIdentityProviderRepository,
    private jwtWrapper: JwtWrapperService
  ) {}

  /**
   * Verifies a JWT from an id_token_hint, validates its issuer, and extracts user data.
   * @throws {InvalidOAuthRequestException} If the token is invalid or from an untrusted issuer.
   */
  async verifyAndExtractUser(token: string): Promise<JWTUserData> {
    const decodedPayload = this.decodeAndValidateBasicClaims(token)
    const trustedProvider = await this.findTrustedProvider(decodedPayload.iss!)
    const verifiedPayload = await this.verifyTokenSignature(token, trustedProvider)
    const userData = this.extractUserData(verifiedPayload, trustedProvider)

    return userData
  }

  /**
   * Decodes the JWT and validates basic required claims.
   * @throws {InvalidOAuthRequestException} If the JWT is missing required claims.
   */
  private decodeAndValidateBasicClaims(token: string): JWTPayloadType {
    try {
      const payload = this.jwtWrapper.decodeJwt(token)

      if (!payload.iss) {
        throw new InvalidOAuthRequestException('invalid_request', 'JWT missing issuer (iss) claim')
      }

      return payload
    } catch (error) {
      logger.error({ error }, 'JWT decoding failed:')
      throw new InvalidOAuthRequestException('invalid_request', 'Invalid JWT format or structure')
    }
  }

  /**
   * Finds a trusted provider based on the issuer claim.
   * @throws {InvalidOAuthRequestException} If the issuer is not trusted or misconfigured.
   */
  private async findTrustedProvider(issuer: string): Promise<TrustedIdentityProvider> {
    const trustedProvider = await this.trustedProviderRepository.findByIssuer(issuer)

    if (!trustedProvider?.jwksUri) {
      logger.warn(`Untrusted JWT issuer: ${issuer}`)
      throw new InvalidOAuthRequestException(
        'invalid_request',
        'Untrusted or misconfigured JWT issuer'
      )
    }

    return trustedProvider
  }

  /**
   * Verifies the JWT signature against the provider's JWKS endpoint.
   * @throws {InvalidOAuthRequestException} If signature verification fails.
   */
  private async verifyTokenSignature(
    token: string,
    provider: TrustedIdentityProvider
  ): Promise<JWTPayloadType> {
    try {
      const jwks = this.jwtWrapper.createRemoteJWKSet(new URL(provider.jwksUri!))

      const { payload } = await this.jwtWrapper.jwtVerify(token, jwks, {
        issuer: provider.issuerUrl,
        audience: provider.expectedAudience || undefined,
      })

      return payload
    } catch (error) {
      logger.error(
        {
          error: error.message,
          issuer: provider.issuerUrl,
          jwksUri: provider.jwksUri,
          tokenType: typeof token,
          tokenLength: token?.length || 0,
        },
        'JWT verification failed:'
      )
      throw new InvalidOAuthRequestException(
        'invalid_grant',
        `Invalid JWT signature or claims: ${error.message}`
      )
    }
  }

  /**
   * Extracts standardized user data from the verified JWT payload.
   * @throws {InvalidOAuthRequestException} If required user data is missing.
   */
  private extractUserData(payload: JWTPayloadType, provider: TrustedIdentityProvider): JWTUserData {
    const email = payload.email as string | undefined
    const sub = payload.sub

    if (!email || !sub) {
      throw new InvalidOAuthRequestException(
        'invalid_grant',
        'JWT missing required email or sub claim'
      )
    }

    // Extract organization data if present
    const organizationData = this.extractOrganizationData(payload)

    return {
      email,
      username: (payload.username as string) || email.split('@')[0],
      external_user_id: sub,
      external_idp_id: provider.id,
      organization: organizationData,
    }
  }

  /**
   * Extracts organization data from JWT payload if present.
   * Organization data is optional for backward compatibility.
   */
  private extractOrganizationData(payload: JWTPayloadType): JWTOrganizationData | undefined {
    const orgClaim = payload.organization || payload.org

    if (!orgClaim || typeof orgClaim !== 'object') {
      return undefined
    }

    const orgData = orgClaim as Record<string, any>
    const username = orgData.username

    if (!username || typeof username !== 'string') {
      // Organization data is present but invalid - log warning but don't fail
      logger.warn('JWT contains organization claim but missing required username field')
      return undefined
    }

    return {
      username: username.toLowerCase().trim(), // Normalize for consistency
    }
  }
}
