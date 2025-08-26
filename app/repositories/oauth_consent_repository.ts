import OauthConsent from '#models/oauth_consent'
import { DateTime } from 'luxon'

export default class OAuthConsentRepository {
  /**
   * Find existing consent for user/client combination
   */
  async findByUserAndClient(userId: string, clientId: string): Promise<OauthConsent | null> {
    return OauthConsent.query()
      .where('user_id', userId)
      .where('client_id', clientId)
      .where('is_revoked', false)
      .where((query) => {
        query.whereNull('expires_at').orWhere('expires_at', '>', DateTime.now().toSQL())
      })
      .first()
  }

  /**
   * Create or update consent record
   */
  async createOrUpdate(data: {
    userId: string
    clientId: string
    scopes: string[]
    expiresAt?: DateTime | null
  }): Promise<OauthConsent> {
    const existing = await OauthConsent.query()
      .where('user_id', data.userId)
      .where('client_id', data.clientId)
      .first()

    if (existing) {
      // Update existing consent
      existing.merge({
        scopes: data.scopes,
        grantedAt: DateTime.now(),
        expiresAt: data.expiresAt || null,
        isRevoked: false,
      })
      await existing.save()
      return existing
    } else {
      // Create new consent
      return OauthConsent.create({
        userId: data.userId,
        clientId: data.clientId,
        scopes: data.scopes,
        grantedAt: DateTime.now(),
        expiresAt: data.expiresAt || null,
        isRevoked: false,
      })
    }
  }

  /**
   * Revoke consent
   */
  async revoke(userId: string, clientId: string): Promise<void> {
    await OauthConsent.query()
      .where('user_id', userId)
      .where('client_id', clientId)
      .update({ is_revoked: true })
  }

  /**
   * Check if user has granted consent for specific scopes
   */
  async hasConsentForScopes(
    userId: string,
    clientId: string,
    requestedScopes: string[]
  ): Promise<boolean> {
    const consent = await this.findByUserAndClient(userId, clientId)

    if (!consent) {
      return false
    }

    // Check if all requested scopes are included in granted scopes
    return requestedScopes.every((scope) => consent.scopes.includes(scope))
  }

  /**
   * Get all consents for a user
   */
  async findByUser(userId: string): Promise<OauthConsent[]> {
    return OauthConsent.query()
      .where('user_id', userId)
      .where('is_revoked', false)
      .preload('client')
      .orderBy('created_at', 'desc')
  }

  /**
   * Clean up expired consents
   */
  async deleteExpired(): Promise<number> {
    const result = await OauthConsent.query()
      .whereNotNull('expires_at')
      .where('expires_at', '<', DateTime.now().toSQL())
      .delete()

    return Array.isArray(result) ? result.length : result
  }
}
