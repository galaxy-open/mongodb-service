import TrustedIdentityProvider from '#models/trusted_identity_provider'

export default class TrustedIdentityProviderRepository {
  /**
   * Retrieves a paginated list of TrustedIdentityProvider instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<TrustedIdentityProvider[]> {
    const result = await TrustedIdentityProvider.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves a TrustedIdentityProvider instance by its ID.
   */
  public async findById(id: string): Promise<TrustedIdentityProvider | null> {
    return TrustedIdentityProvider.find(id)
  }

  /**
   * Retrieves a TrustedIdentityProvider instance by its slug.
   */
  public async findBySlug(slug: string): Promise<TrustedIdentityProvider | null> {
    return TrustedIdentityProvider.query().where('slug', slug).first()
  }

  /**
   * Retrieves a TrustedIdentityProvider instance by its issuer URL.
   */
  public async findByIssuerUrl(issuerUrl: string): Promise<TrustedIdentityProvider | null> {
    return TrustedIdentityProvider.query().where('issuer_url', issuerUrl).first()
  }

  /**
   * Retrieves all active TrustedIdentityProvider instances.
   */
  public async findActive(): Promise<TrustedIdentityProvider[]> {
    return TrustedIdentityProvider.query().where('is_active', true)
  }

  /**
   * Creates a new TrustedIdentityProvider instance.
   */
  public async create(data: Partial<TrustedIdentityProvider>): Promise<TrustedIdentityProvider> {
    return TrustedIdentityProvider.create(data)
  }

  /**
   * Updates an existing TrustedIdentityProvider instance.
   */
  public async update(
    id: string,
    data: Partial<TrustedIdentityProvider>
  ): Promise<TrustedIdentityProvider | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a TrustedIdentityProvider instance by its ID.
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Deactivates a TrustedIdentityProvider instance.
   */
  public async deactivate(id: string): Promise<TrustedIdentityProvider | null> {
    return this.update(id, { isActive: false })
  }

  /**
   * Activates a TrustedIdentityProvider instance.
   */
  public async activate(id: string): Promise<TrustedIdentityProvider | null> {
    return this.update(id, { isActive: true })
  }

  /**
   * Find trusted identity provider by issuer URL
   */
  async findByIssuer(issuerUrl: string) {
    return TrustedIdentityProvider.query().where('issuer_url', issuerUrl).first()
  }

  /**
   * Create a trusted identity provider (with JWKS)
   */
  async createProvider(
    data: Pick<
      TrustedIdentityProvider,
      'name' | 'issuerUrl' | 'jwksUri' | 'expectedAudience' | 'slug'
    >
  ) {
    return TrustedIdentityProvider.create({
      name: data.name,
      issuerUrl: data.issuerUrl,
      jwksUri: data.jwksUri,
      slug: data.slug,
      expectedAudience: data.expectedAudience,
    })
  }

  /**
   * Update JWKS URI for a provider
   */
  async updateJwksUri(providerId: string, jwksUri: string) {
    const provider = await TrustedIdentityProvider.find(providerId)
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`)
    }

    provider.jwksUri = jwksUri
    await provider.save()
    return provider
  }

  /**
   * Check if provider slug already exists
   */
  async slugExists(slug: string): Promise<boolean> {
    const provider = await TrustedIdentityProvider.query().where('slug', slug).first()
    return !!provider
  }
}
