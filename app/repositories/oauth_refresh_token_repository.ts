import OAuthRefreshToken from '#models/oauth_refresh_token'
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
   * Retrieves an OAuthRefreshToken instance by its UUID.
   */
  public async findByToken(token: string): Promise<OAuthRefreshToken | null> {
    return OAuthRefreshToken.find(token)
  }

  /**
   * Creates a new OAuthRefreshToken instance (UUID generated automatically).
   */
  public async create(data: Partial<OAuthRefreshToken>): Promise<OAuthRefreshToken> {
    return OAuthRefreshToken.create(data)
  }

  /**
   * Finds and validates a refresh token.
   */
  public async findAndValidate(token: string): Promise<OAuthRefreshToken | null> {
    return this.findByTokenWithRelations(token)
  }

  /**
   * Finds refresh token by access token ID.
   */
  public async findByAccessToken(accessTokenId: string): Promise<OAuthRefreshToken | null> {
    return OAuthRefreshToken.query().where('access_token_id', accessTokenId).first()
  }

  /**
   * Revokes a refresh token.
   */
  public async revoke(tokenId: string): Promise<OAuthRefreshToken | null> {
    const token = await this.findByToken(tokenId)
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
   * Deletes an OAuthRefreshToken instance by its token ID.
   */
  public async delete(tokenId: string): Promise<void> {
    const modelInstance = await this.findByToken(tokenId)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Finds a refresh token with relations - PERFORMANCE FIX: Direct UUID lookup.
   */
  public async findByTokenWithRelations(token: string): Promise<OAuthRefreshToken | null> {
    return OAuthRefreshToken.query()
      .where('id', token)
      .where('is_revoked', false)
      .where(function (query) {
        query.whereNull('expires_at').orWhere('expires_at', '>', DateTime.now().toSQL())
      })
      .preload('user')
      .preload('client')
      .preload('organization')
      .first()
  }
}
