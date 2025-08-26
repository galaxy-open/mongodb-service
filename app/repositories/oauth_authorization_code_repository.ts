import OAuthAuthorizationCode from '#models/oauth_authorization_code'
import { DateTime } from 'luxon'

export default class OAuthAuthorizationCodeRepository {
  /**
   * Retrieves a paginated list of OAuthAuthorizationCode instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<OAuthAuthorizationCode[]> {
    const result = await OAuthAuthorizationCode.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves an OAuthAuthorizationCode instance by its UUID.
   */
  public async findByCode(code: string): Promise<OAuthAuthorizationCode | null> {
    return OAuthAuthorizationCode.find(code)
  }

  /**
   * Creates a new OAuthAuthorizationCode instance (UUID generated automatically).
   */
  public async create(data: Partial<OAuthAuthorizationCode>): Promise<OAuthAuthorizationCode> {
    return OAuthAuthorizationCode.create(data)
  }

  /**
   * Finds and validates an authorization code.
   */
  public async findAndValidate(
    code: string,
    clientId: string,
    redirectUri: string
  ): Promise<OAuthAuthorizationCode | null> {
    const codeRecord = await this.findByCode(code)

    if (!codeRecord) {
      return null
    }

    // Verify client and redirect URI match
    if (codeRecord.clientId !== clientId || codeRecord.redirectUri !== redirectUri) {
      return null
    }

    return codeRecord
  }

  /**
   * Marks an authorization code as used.
   */
  public async markAsUsed(codeId: string): Promise<OAuthAuthorizationCode | null> {
    const authCode = await this.findByCode(codeId)
    if (!authCode) {
      return null
    }

    authCode.isUsed = true
    authCode.usedAt = DateTime.now()
    await authCode.save()
    return authCode
  }

  /**
   * Deletes expired authorization codes.
   */
  public async deleteExpired(): Promise<number> {
    const result = await OAuthAuthorizationCode.query()
      .where('expires_at', '<', DateTime.now().toSQL())
      .delete()

    return Array.isArray(result) ? result.length : result
  }

  /**
   * Deletes an OAuthAuthorizationCode instance by its code ID.
   */
  public async delete(codeId: string): Promise<void> {
    const modelInstance = await this.findByCode(codeId)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Finds an authorization code with relations - PERFORMANCE FIX: Direct UUID lookup.
   */
  public async findByCodeWithRelations(code: string): Promise<OAuthAuthorizationCode | null> {
    return OAuthAuthorizationCode.query()
      .where('id', code)
      .where('is_used', false)
      .where('expires_at', '>', DateTime.now().toSQL())
      .preload('user')
      .preload('client')
      .preload('organization')
      .first()
  }
}
