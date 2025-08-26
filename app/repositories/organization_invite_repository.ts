import Organization from '#models/organization'
import OrganizationInvite from '#models/organization_invite'
import { DateTime } from 'luxon'

export default class OrganizationInviteRepository {
  /**
   * Retrieves a paginated list of OrganizationInvite instances.
   * @param page - The page number to retrieve.
   * @param limit - The number of items per page.
   * @returns A promise that resolves to an array of OrganizationInvite instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<OrganizationInvite[]> {
    return OrganizationInvite.query().paginate(page, limit)
  }

  /**
   * Retrieves a OrganizationInvite instance by its ID.
   * @param id - The ID of the OrganizationInvite to retrieve.
   * @returns A promise that resolves to the OrganizationInvite instance or null if not found.
   */
  public async findById(id: string): Promise<OrganizationInvite | null> {
    return OrganizationInvite.findOrFail(id)
  }

  /**
   * Creates a new OrganizationInvite instance.
   * @param data - The data to create the OrganizationInvite with.
   * @returns A promise that resolves to the created OrganizationInvite instance.
   */
  public async create(data: Partial<OrganizationInvite>): Promise<OrganizationInvite> {
    return OrganizationInvite.create(data)
  }

  /**
   * Updates an existing OrganizationInvite instance.
   * @param id - The ID of the OrganizationInvite to update.
   * @param data - The data to update the OrganizationInvite with.
   * @returns A promise that resolves to the updated OrganizationInvite instance or null if not found.
   */
  public async update(
    id: string,
    data: Partial<OrganizationInvite>
  ): Promise<OrganizationInvite | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a OrganizationInvite instance by its ID.
   * @param id - The ID of the OrganizationInvite to delete.
   * @returns A promise that resolves when the OrganizationInvite is deleted.
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  public async getPendingInvites(organization: Organization) {
    return organization
      .related('invites')
      .query()
      .whereNull('acceptedAt')
      .whereNull('canceledAt')
      .orderBy('createdAt', 'desc')
  }

  public async cancelInvite(
    organization: Organization,
    canceledByUserId: string,
    inviteId: string
  ) {
    const invite = await organization.related('invites').query().where('id', inviteId).first()
    if (!invite) {
      throw new Error(`OrganizationInvite with id ${inviteId} not found`)
    }

    invite.canceledAt = DateTime.now()
    invite.canceledByUserId = canceledByUserId

    await invite.save()

    return invite
  }
}
