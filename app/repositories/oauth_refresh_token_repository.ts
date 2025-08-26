import OAuthRefreshToken from '#models/oauth_refresh_token'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'

export default class OAuthRefreshTokenRepository {
  /**
   * Retrieves a paginated list of OAuthRefreshToken instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<OAuthRefreshToken[]> {
    const result = await OAuthRefreshToken.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves an OAuthRefreshToken instance by its token hash.
   */
  public async findByTokenHash(tokenHash: string): Promise<OAuthRefreshToken | null> {
    return OAuthRefreshToken.find(tokenHash)
  }

  /**
   * Creates a new OAuthRefreshToken instance with a hashed token.
   */
  public async create(
    data: Partial<OAuthRefreshToken> & { token: string }
  ): Promise<OAuthRefreshToken> {
    const { token, ...tokenData } = data
    const tokenHash = await hash.make(token)

    return OAuthRefreshToken.create({
      ...tokenData,
      tokenHash,
    })
  }

  /**
   * Finds and validates a refresh token.
   */
  public async findAndValidate(token: string): Promise<OAuthRefreshToken | null> {
    return this.findByToken(token)
  }

  /**
   * Finds refresh token by access token hash.
   */
  public async findByAccessToken(accessTokenHash: string): Promise<OAuthRefreshToken | null> {
    return OAuthRefreshToken.query().where('access_token_hash', accessTokenHash).first()
  }

  /**
   * Revokes a refresh token.
   */
  public async revoke(tokenHash: string): Promise<OAuthRefreshToken | null> {
    const token = await this.findByTokenHash(tokenHash)
    if (!token) {
      return null
    }

    token.isRevoked = true
    token.revokedAt = DateTime.now()
    await token.save()
    return token
  }

  /**
   * Revokes all refresh tokens for a user and client.
   */
  public async revokeAllForUserAndClient(userId: string, clientId: string): Promise<number> {
    const result = await OAuthRefreshToken.query()
      .where('user_id', userId)
      .where('client_id', clientId)
      .where('is_revoked', false)
      .update({
        is_revoked: true,
        revoked_at: DateTime.now().toSQL(),
      })

    return Array.isArray(result) ? result.length : result
  }

  /**
   * Deletes expired refresh tokens.
   */
  public async deleteExpired(): Promise<number> {
    const result = await OAuthRefreshToken.query()
      .whereNotNull('expires_at')
      .where('expires_at', '<', DateTime.now().toSQL())
      .delete()

    return Array.isArray(result) ? result.length : result
  }

  /**
   * Deletes an OAuthRefreshToken instance by its token hash.
   */
  public async delete(tokenHash: string): Promise<void> {
    const modelInstance = await this.findByTokenHash(tokenHash)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Finds a refresh token by the actual token value (validates hash).
   */
  public async findByToken(token: string): Promise<OAuthRefreshToken | null> {
    try {
      const potentialMatches = await OAuthRefreshToken.query()
        .where('is_revoked', false)
        .where(function (query) {
          query.whereNull('expires_at').orWhere('expires_at', '>', DateTime.now().toSQL())
        })
        .preload('user')
        .preload('client')

      for (const tokenRecord of potentialMatches) {
        const isValid = await hash.verify(tokenRecord.tokenHash, token)
        if (isValid) {
          return tokenRecord
        }
      }
      return null
    } catch {
      return null
    }
  }
}
