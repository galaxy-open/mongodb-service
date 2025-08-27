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
   * Retrieves a JwkKey instance by its UUID.
   */
  public async findById(keyId: string): Promise<JwkKey | null> {
    return JwkKey.find(keyId)
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
      .select(['id', 'key_type', 'algorithm', 'use', 'public_key_data'])
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
  public async update(keyId: string, data: Partial<JwkKey>): Promise<JwkKey | null> {
    const modelInstance = await this.findById(keyId)
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
  public async deactivate(keyId: string): Promise<JwkKey | null> {
    return this.update(keyId, { isActive: false })
  }

  /**
   * Deletes expired keys.
   */
  public async deleteExpired(): Promise<number> {
    const result = await JwkKey.query().where('expires_at', '<', DateTime.now().toSQL()).delete()

    return Array.isArray(result) ? result.length : result
  }

  /**
   * Deletes a JwkKey instance by its UUID.
   */
  public async delete(keyId: string): Promise<void> {
    const modelInstance = await this.findById(keyId)
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
   * Creates a new signing key using AdonisJS services (UUID generated automatically).
   */
  public async createSigningKey(
    algorithm: string = 'HS256',
    expiresIn: number = 86400 * 30 // 30 days
  ): Promise<JwkKey> {
    const secretKey = string.random(64)

    const key = await this.create({
      keyType: 'oct',
      algorithm,
      use: 'sig',
      publicKeyData: {},
      privateKeyPem: secretKey,
      isActive: true,
      expiresAt: DateTime.now().plus({ seconds: expiresIn }),
    })

    // Update publicKeyData with the generated UUID as kid
    key.publicKeyData = {
      kty: 'oct',
      use: 'sig',
      alg: algorithm,
      kid: key.id, // Use the auto-generated UUID as kid
    }
    await key.save()

    return key
  }

  /**
   * Rotates signing keys (deactivates old, creates new).
   */
  public async rotateSigningKey(): Promise<JwkKey> {
    const currentKey = await this.getCurrentSigningKey()
    if (currentKey) {
      await this.deactivate(currentKey.id)
    }

    return this.createSigningKey()
  }
}
