import OAuthAuthorizationCode from '#models/oauth_authorization_code'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'

export default class OAuthAuthorizationCodeRepository {
  /**
   * Retrieves a paginated list of OAuthAuthorizationCode instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<OAuthAuthorizationCode[]> {
    const result = await OAuthAuthorizationCode.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves an OAuthAuthorizationCode instance by its code hash.
   */
  public async findByCodeHash(codeHash: string): Promise<OAuthAuthorizationCode | null> {
    return OAuthAuthorizationCode.find(codeHash)
  }

  /**
   * Creates a new OAuthAuthorizationCode instance with hashed code.
   */
  public async create(
    data: Partial<OAuthAuthorizationCode> & { code: string }
  ): Promise<OAuthAuthorizationCode> {
    const { code, ...codeData } = data
    const codeHash = await hash.make(code)

    return OAuthAuthorizationCode.create({
      ...codeData,
      codeHash,
    })
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
   * Marks a code as used by code hash.
   */
  public async markAsUsedByCode(code: string): Promise<OAuthAuthorizationCode | null> {
    const codeRecord = await this.findByCode(code)
    if (!codeRecord) {
      return null
    }

    return this.markAsUsed(codeRecord.codeHash)
  }

  /**
   * Marks an authorization code as used.
   */
  public async markAsUsed(codeHash: string): Promise<OAuthAuthorizationCode | null> {
    const authCode = await this.findByCodeHash(codeHash)
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
   * Deletes an OAuthAuthorizationCode instance by its code hash.
   */
  public async delete(codeHash: string): Promise<void> {
    const modelInstance = await this.findByCodeHash(codeHash)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Finds an authorization code by the actual code value (validates hash).
   */
  public async findByCode(code: string): Promise<OAuthAuthorizationCode | null> {
    try {
      const potentialMatches = await OAuthAuthorizationCode.query()
        .where('is_used', false)
        .where('expires_at', '>', DateTime.now().toSQL())
        .preload('user')
        .preload('client')

      for (const codeRecord of potentialMatches) {
        const isValid = await hash.verify(codeRecord.codeHash, code)
        if (isValid) {
          return codeRecord
        }
      }
      return null
    } catch {
      return null
    }
  }
}
