import UserRoles from '#enums/user_roles'
import Organization from '#models/organization'
import Owner from '#models/owner'
import db from '@adonisjs/lucid/services/db'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface CreateOrganizationData extends Partial<Organization> {
  username: string
}

export default class OrganizationRepository {
  /**
   * Retrieves a paginated list of Organization instances.
   * @param page - The page number to retrieve.
   * @param limit - The number of items per page.
   * @returns A promise that resolves to an array of Organization instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<Organization[]> {
    return Organization.query().paginate(page, limit)
  }

  /**
   * Retrieves a Organization instance by its ID.
   * @param id - The ID of the Organization to retrieve.
   * @returns A promise that resolves to the Organization instance or null if not found.
   */
  public async findById(id: string): Promise<Organization | null> {
    return Organization.query().where('id', id).first()
  }

  /**
   * Creates a new Organization instance with its Owner.
   * @param data - The data to create the Organization with (including username).
   * @returns A promise that resolves to the created Organization instance.
   */
  public async create(
    data: CreateOrganizationData,
    trx?: TransactionClientContract
  ): Promise<Organization> {
    return db.transaction(async (transaction) => {
      const client = trx || transaction

      // Extract username and other organization data
      const { username, ...organizationData } = data

      // Create the Organization first with username
      const organization = await Organization.create(
        {
          ...organizationData,
          username,
        },
        { client }
      )

      // Create the Owner entity that references this organization
      await Owner.create({ organizationId: organization.id }, { client })

      return organization
    })
  }

  /**
   * Assigns admin role to a user in an organization
   */
  public async assignAdmin(organization: Organization, userId: string | number) {
    return organization.related('users').attach({
      [userId]: {
        role_name: UserRoles.ADMIN,
      },
    })
  }

  /**
   * Updates an existing Organization instance.
   * @param id - The ID of the Organization to update.
   * @param data - The data to update the Organization with.
   * @returns A promise that resolves to the updated Organization instance or null if not found.
   */
  public async update(id: string, data: Partial<Organization>): Promise<Organization | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a Organization instance by its ID.
   * @param id - The ID of the Organization to delete.
   * @returns A promise that resolves when the Organization is deleted.
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  public async deleteDanglingOrganizations(
    userId: string | number,
    trx: TransactionClientContract
  ) {
    return Organization.query({ client: trx })
      .whereHas('users', (query) => query.where('users.id', userId))
      .whereDoesntHave('users', (query) => query.whereNot('users.id', userId))
      .delete()
  }

  public async getActive(userId: number | string, activeId: number | string) {
    let organization = await Organization.query()
      .whereHas('users', (userQueryBuilder) => {
        userQueryBuilder.where('id', userId)
      })
      .if(activeId, (query) => query.where('id', activeId))
      .first()

    if (!organization) {
      organization = await Organization.query()
        .whereHas('users', (userQueryBuilder) => {
          userQueryBuilder.where('id', userId)
        })
        .first()
    }

    return organization
  }

  public async removeUser(organization: Organization, removeUserId: number) {
    const otherUserCount = await organization
      .related('users')
      .query()
      .whereNot('users.id', removeUserId)
      .count('users.id')
      .first()

    if (!otherUserCount) {
      throw new Error(`Organization with userId ${removeUserId} not found`)
    }

    await db.transaction(async (trx) => {
      organization.useTransaction(trx)

      await organization.related('users').detach([removeUserId])

      if (otherUserCount.$extras.count === '0') {
        await organization.delete()
      }
    })
  }

  public async getUsers(organization: Organization) {
    return organization.related('users').query().orderBy('createdAt')
  }

  /**
   * Gets the role ID for a user in an organization using many-to-many relationship
   */
  public async getUserRoleId(organizationId: number | string, userId: number | string) {
    const organization = await Organization.findOrFail(organizationId)

    const users = await organization
      .related('users')
      .query()
      .where('users.id', userId)
      .pivotColumns(['role_name'])
      .first()

    if (!users) {
      throw new Error(
        `User with userId ${userId} not found in organization with id ${organizationId}`
      )
    }

    return users.$extras.pivot_role_name
  }

  /**
   * Finds organization by username
   */
  public async findByUsername(
    username: string,
    trx?: TransactionClientContract
  ): Promise<Organization | null> {
    return Organization.query({ client: trx })
      .whereRaw('LOWER(username) = ?', [username.toLowerCase()])
      .first()
  }

  /**
   * Finds user membership in organization using many-to-many relationship
   */
  public async findUserMembership(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ) {
    const organization = await Organization.findOrFail(organizationId)

    if (trx) {
      organization.useTransaction(trx)
    }

    return organization
      .related('users')
      .query()
      .where('users.id', userId)
      .pivotColumns(['role_name'])
      .first()
  }

  /**
   * Assigns user to organization with specified role using many-to-many relationship
   */
  public async assignUserToOrganization(
    userId: string,
    organizationId: string,
    roleId: UserRoles,
    trx?: TransactionClientContract
  ): Promise<void> {
    const organization = await Organization.query({ client: trx })
      .where('id', organizationId)
      .firstOrFail()

    if (trx) {
      organization.useTransaction(trx)
    }

    await organization.related('users').attach({
      [userId]: {
        role_name: roleId,
      },
    })
  }

  /**
   * Updates user role in organization
   */
  public async updateUserRole(
    userId: string,
    organizationId: string,
    roleId: UserRoles,
    trx?: TransactionClientContract
  ): Promise<void> {
    const organization = await Organization.findOrFail(organizationId)

    if (trx) {
      organization.useTransaction(trx)
    }

    // Use sync to update the role for this specific user
    await organization.related('users').sync(
      {
        [userId]: {
          role_name: roleId,
        },
      },
      false
    ) // false = don't detach other users
  }

  /**
   * Remove user from organization
   */
  public async removeUserFromOrganization(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const organization = await Organization.findOrFail(organizationId)

    if (trx) {
      organization.useTransaction(trx)
    }

    await organization.related('users').detach([userId])
  }

  /**
   * Get organization with users and their roles
   */
  public async findWithUsers(organizationId: string): Promise<Organization | null> {
    return Organization.query()
      .where('id', organizationId)
      .preload('users', (query) => {
        query.pivotColumns(['role_name'])
      })
      .first()
  }
}
