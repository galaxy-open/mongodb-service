import Owner from '#models/owner'
import User from '#models/user'
import Organization from '#models/organization'

export default class OwnerRepository {
  /**
   * Retrieves a paginated list of Owner instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<Owner[]> {
    const result = await Owner.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves an Owner instance by its ID.
   */
  public async findById(id: string): Promise<Owner | null> {
    return Owner.find(id)
  }

  /**
   * Finds Owner by User ID
   */
  public async findByUserId(
    userId: string
  ): Promise<(Owner['$attributes'] & { username: string }) | null> {
    const owner = await Owner.query().where('user_id', userId).preload('user').first()

    if (!owner) {
      return null
    }

    return {
      ...owner.$attributes,
      username: owner?.user.username,
    }
  }

  /**
   * Finds Owner by Organization ID
   */
  public async findByOrganizationId(
    organizationId: string
  ): Promise<(Owner['$attributes'] & { username: string }) | null> {
    const owner = await Owner.query()
      .where('organization_id', organizationId)
      .preload('organization')
      .first()

    if (!owner) {
      return null
    }

    return {
      ...owner.$attributes,
      username: owner.organization.username,
    }
  }

  /**
   * Creates an Owner for a User
   */
  public async createForUser(userId: string): Promise<Owner> {
    return Owner.create({ userId })
  }

  /**
   * Creates an Owner for an Organization
   */
  public async createForOrganization(organizationId: string): Promise<Owner> {
    return Owner.create({ organizationId })
  }

  /**
   * Creates a new Owner instance (general)
   */
  public async create(data: Partial<Owner>): Promise<Owner> {
    return Owner.create(data)
  }

  /**
   * Updates an existing Owner instance
   */
  public async update(id: string, data: Partial<Owner>): Promise<Owner | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes an Owner instance by its ID
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Gets the associated user for an owner.
   */
  public async getUser(ownerId: string): Promise<User | null> {
    const owner = await this.findById(ownerId)
    if (!owner || !owner.userId) {
      return null
    }
    return User.find(owner.userId)
  }

  /**
   * Gets the associated organization for an owner.
   */
  public async getOrganization(ownerId: string): Promise<Organization | null> {
    const owner = await this.findById(ownerId)
    if (!owner || !owner.organizationId) {
      return null
    }
    return Organization.find(owner.organizationId)
  }

  /**
   * Finds owner for OAuth token context (user or organization)
   */
  public async findForTokenContext(tokenData: {
    user: { id: string }
    organization?: { id: string }
  }) {
    if (tokenData.organization) {
      return this.findByOrganizationId(tokenData.organization.id)
    }

    return this.findByUserId(tokenData.user.id)
  }

  /**
   * Gets owner with full details (user or organization).
   */
  public async findWithDetails(id: string): Promise<Owner | null> {
    return Owner.query()
      .where('id', id)
      .preload('user')
      .preload('organization')
      .preload('databaseInstances')
      .first()
  }

  /**
   * Get all owners who have databases
   */
  public async findAllWithDatabases(): Promise<Owner[]> {
    return Owner.query()
      .whereHas('databaseInstances', (query) => {
        query.whereNull('deleted_at') // Only active databases
      })
      .preload('user')
      .preload('organization')
  }

  /**
   * Get owner username by id (user or organization)
   */
  public async findOwnerUsernameById(id: string): Promise<string | null> {
    const owner = await this.findById(id)
    if (!owner) {
      return null
    }
    return owner.organization?.username ?? owner.user?.username ?? null
  }
}
