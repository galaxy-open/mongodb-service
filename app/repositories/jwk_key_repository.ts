import JwkKey from '#models/jwk_key'
import { DateTime } from 'luxon'
import string from '@adonisjs/core/helpers/string'

export default class JwkKeyRepository {
  /**
   * Retrieves a paginated list of JwkKey instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<JwkKey[]> {
    const result = await JwkKey.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves a JwkKey instance by its kid (key ID).
   */
  public async findById(kid: string): Promise<JwkKey | null> {
    return JwkKey.find(kid)
  }

  /**
   * Retrieves all active JwkKey instances.
   */
  public async findActive(): Promise<JwkKey[]> {
    return JwkKey.query()
      .where('is_active', true)
      .where('expires_at', '>', DateTime.now().toSQL())
      .orderBy('created_at', 'desc')
  }

  /**
   * Retrieves active keys for JWKS endpoint.
   */
  public async findForJWKS(): Promise<JwkKey[]> {
    return JwkKey.query()
      .where('is_active', true)
      .where('expires_at', '>', DateTime.now().toSQL())
      .select(['kid', 'key_type', 'algorithm', 'use', 'public_key_data'])
      .orderBy('created_at', 'desc')
  }

  /**
   * Retrieves keys by algorithm.
   */
  public async findByAlgorithm(algorithm: string): Promise<JwkKey[]> {
    return JwkKey.query()
      .where('algorithm', algorithm)
      .where('is_active', true)
      .where('expires_at', '>', DateTime.now().toSQL())
      .orderBy('created_at', 'desc')
  }

  /**
   * Retrieves keys by use (sig, enc).
   */
  public async findByUse(use: string): Promise<JwkKey[]> {
    return JwkKey.query()
      .where('use', use)
      .where('is_active', true)
      .where('expires_at', '>', DateTime.now().toSQL())
      .orderBy('created_at', 'desc')
  }

  /**
   * Retrieves the current signing key.
   */
  public async getCurrentSigningKey(): Promise<JwkKey | null> {
    return JwkKey.query()
      .where('use', 'sig')
      .where('is_active', true)
      .where('expires_at', '>', DateTime.now().toSQL())
      .orderBy('created_at', 'desc')
      .first()
  }

  /**
   * Creates a new JwkKey instance.
   */
  public async create(data: Partial<JwkKey>): Promise<JwkKey> {
    return JwkKey.create(data)
  }

  /**
   * Updates an existing JwkKey instance.
   */
  public async update(kid: string, data: Partial<JwkKey>): Promise<JwkKey | null> {
    const modelInstance = await this.findById(kid)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deactivates a key.
   */
  public async deactivate(kid: string): Promise<JwkKey | null> {
    return this.update(kid, { isActive: false })
  }

  /**
   * Deletes expired keys.
   */
  public async deleteExpired(): Promise<number> {
    const result = await JwkKey.query().where('expires_at', '<', DateTime.now().toSQL()).delete()

    return Array.isArray(result) ? result.length : result
  }

  /**
   * Deletes a JwkKey instance by its kid.
   */
  public async delete(kid: string): Promise<void> {
    const modelInstance = await this.findById(kid)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Gets the most recent active signing key.
   */
  public async getLatestSigningKey(): Promise<JwkKey | null> {
    return this.getCurrentSigningKey()
  }

  /**
   * Creates a new RSA signing key pair using AdonisJS services.
   */
  public async createRSASigningKey(
    kid: string,
    algorithm: string = 'HS256',
    expiresIn: number = 86400 * 30 // 30 days
  ): Promise<JwkKey> {
    const secretKey = string.random(64)

    return this.create({
      kid,
      keyType: 'oct',
      algorithm,
      use: 'sig',
      publicKeyData: {
        kty: 'oct',
        use: 'sig',
        alg: algorithm,
        kid,
      },
      privateKeyPem: secretKey,
      isActive: true,
      expiresAt: DateTime.now().plus({ seconds: expiresIn }),
    })
  }

  /**
   * Rotates signing keys (deactivates old, creates new).
   */
  public async rotateSigningKey(): Promise<JwkKey> {
    const currentKey = await this.getCurrentSigningKey()
    if (currentKey) {
      await this.deactivate(currentKey.kid)
    }

    const newKid = `signing-${Date.now()}`
    return this.createRSASigningKey(newKid)
  }
}
