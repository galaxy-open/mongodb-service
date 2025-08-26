import OAuthAccessToken from '#models/oauth_access_token'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'

export default class OAuthAccessTokenRepository {
  /**
   * Retrieves a paginated list of OAuthAccessToken instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<OAuthAccessToken[]> {
    const result = await OAuthAccessToken.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves an OAuthAccessToken instance by its token hash.
   */
  public async findByTokenHash(tokenHash: string): Promise<OAuthAccessToken | null> {
    return OAuthAccessToken.find(tokenHash)
  }

  /**
   * Creates a new OAuthAccessToken instance with a hashed token.
   */
  public async create(
    data: Partial<OAuthAccessToken> & { token: string }
  ): Promise<OAuthAccessToken> {
    const { token, ...tokenData } = data
    const tokenHash = await hash.make(token)

    return OAuthAccessToken.create({
      ...tokenData,
      tokenHash,
    })
  }

  /**
   * Finds and validates an access token.
   */
  public async findAndValidate(token: string): Promise<OAuthAccessToken | null> {
    return this.findByToken(token)
  }

  /**
   * Finds active tokens for a user and client.
   */
  public async findActiveByUserAndClient(
    userId: string,
    clientId: string
  ): Promise<OAuthAccessToken[]> {
    return OAuthAccessToken.query()
      .where('user_id', userId)
      .where('client_id', clientId)
      .where('is_revoked', false)
      .where('expires_at', '>', DateTime.now().toSQL())
  }

  /**
   * Revokes an access token.
   */
  public async revoke(tokenHash: string): Promise<OAuthAccessToken | null> {
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
   * Revokes all tokens for a user and client.
   */
  public async revokeAllForUserAndClient(userId: string, clientId: string): Promise<number> {
    const result = await OAuthAccessToken.query()
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
   * Deletes expired access tokens.
   */
  public async deleteExpired(): Promise<number> {
    const result = await OAuthAccessToken.query()
      .where('expires_at', '<', DateTime.now().toSQL())
      .delete()

    return Array.isArray(result) ? result.length : result
  }

  /**
   * Deletes an OAuthAccessToken instance by its token hash.
   */
  public async delete(tokenHash: string): Promise<void> {
    const modelInstance = await this.findByTokenHash(tokenHash)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Finds an access token by the actual token value (validates hash).
   */
  public async findByToken(token: string): Promise<OAuthAccessToken | null> {
    // Try to hash the token and find matching record
    try {
      const potentialMatches = await OAuthAccessToken.query()
        .where('is_revoked', false)
        .where('expires_at', '>', DateTime.now().toSQL())
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

  /**
   * Finds an access token by the actual token value with organization preloaded.
   */
  // @TODO - Improve this, instead of using hash, use JWT tokens.
  public async findByTokenWithRelations(token: string): Promise<OAuthAccessToken | null> {
    // Try to hash the token and find matching record
    try {
      const potentialMatches = await OAuthAccessToken.query()
        .where('is_revoked', false)
        .where('expires_at', '>', DateTime.now().toSQL())
        .preload('user')
        .preload('client')
        .preload('organization')

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
