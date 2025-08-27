import OAuthAccessToken from '#models/oauth_access_token'
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
   * Retrieves an OAuthAccessToken instance by its ID (UUID token).
   */
  public async findByToken(token: string): Promise<OAuthAccessToken | null> {
    return OAuthAccessToken.find(token)
  }

  /**
   * Creates a new OAuthAccessToken instance (UUID generated automatically).
   */
  public async create(data: Partial<OAuthAccessToken>): Promise<OAuthAccessToken> {
    return OAuthAccessToken.create(data)
  }

  /**
   * Finds and validates an access token.
   */
  public async findAndValidate(token: string): Promise<OAuthAccessToken | null> {
    return this.findByTokenWithRelations(token)
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
  public async revoke(tokenId: string): Promise<OAuthAccessToken | null> {
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
   * Deletes an OAuthAccessToken instance by its token ID.
   */
  public async delete(tokenId: string): Promise<void> {
    const modelInstance = await this.findByToken(tokenId)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Finds an access token by UUID with all relations preloaded.
   */
  public async findByTokenWithRelations(token: string): Promise<OAuthAccessToken | null> {
    return OAuthAccessToken.query()
      .where('id', token)
      .where('is_revoked', false)
      .where('expires_at', '>', DateTime.now().toSQL())
      .preload('user')
      .preload('client')
      .preload('organization')
      .first()
  }
}
