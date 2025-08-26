import OAuthClient from '#models/oauth_client'
import hash from '@adonisjs/core/services/hash'

export default class OAuthClientRepository {
  /**
   * Retrieves a paginated list of OAuthClient instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<OAuthClient[]> {
    const result = await OAuthClient.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves an OAuthClient instance by its client ID.
   */
  public async findById(clientId: string): Promise<OAuthClient | null> {
    return OAuthClient.find(clientId)
  }

  /**
   * Retrieves an OAuthClient instance by its name.
   */
  public async findByName(clientName: string): Promise<OAuthClient | null> {
    return OAuthClient.query().where('client_name', clientName).first()
  }

  /**
   * Retrieves all trusted OAuthClient instances.
   */
  public async findTrusted(): Promise<OAuthClient[]> {
    return OAuthClient.query().where('is_trusted', true)
  }

  /**
   * Creates a new OAuthClient instance with hashed secret.
   */
  public async create(data: Partial<OAuthClient> & { clientSecret: string }): Promise<OAuthClient> {
    const { clientSecret, ...clientData } = data
    const clientSecretHash = await hash.make(clientSecret)

    return OAuthClient.create({
      ...clientData,
      clientSecretHash,
    })
  }

  /**
   * Updates an existing OAuthClient instance.
   */
  public async update(clientId: string, data: Partial<OAuthClient>): Promise<OAuthClient | null> {
    const modelInstance = await this.findById(clientId)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Updates the client secret for an OAuthClient.
   */
  public async updateSecret(clientId: string, newSecret: string): Promise<OAuthClient | null> {
    const clientSecretHash = await hash.make(newSecret)
    return this.update(clientId, { clientSecretHash })
  }

  /**
   * Verifies client credentials.
   */
  public async verifyCredentials(
    clientId: string,
    clientSecret: string
  ): Promise<OAuthClient | null> {
    const client = await this.findById(clientId)
    if (!client) {
      return null
    }

    const isValidSecret = await hash.verify(client.clientSecretHash, clientSecret)
    return isValidSecret ? client : null
  }

  /**
   * Validates redirect URI for a client.
   */
  public async isValidRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
    const client = await this.findById(clientId)
    if (!client) {
      return false
    }
    return client.redirectUris.includes(redirectUri)
  }

  /**
   * Deletes an OAuthClient instance by its ID.
   */
  public async delete(clientId: string): Promise<void> {
    const modelInstance = await this.findById(clientId)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }
}
