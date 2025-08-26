import User from '#models/user'
import Owner from '#models/owner'
import db from '@adonisjs/lucid/services/db'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface CreateJITUserData {
  email: string
  username: string
  externalIdpId: string
  externalUserId: string
}

export default class UserRepository {
  /**
   * Retrieves a paginated list of User instances.
   * @param page - The page number to retrieve.
   * @param limit - The number of items per page.
   * @returns A promise that resolves to an array of User instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<User[]> {
    return User.query().paginate(page, limit)
  }

  /**
   * Retrieves a User instance by its ID.
   * @param id - The ID of the User to retrieve.
   * @returns A promise that resolves to the User instance or null if not found.
   */
  public async findById(id: string): Promise<User | null> {
    return User.query().where('id', id).first()
  }

  /**
   * Creates a new User instance.
   * @param data - The data to create the User with.
   * @returns A promise that resolves to the created User instance.
   */
  public async create(data: Partial<User>): Promise<User> {
    return User.create(data)
  }

  /**
   * Updates an existing User instance.
   * @param id - The ID of the User to update.
   * @param data - The data to update the User with.
   * @returns A promise that resolves to the updated User instance or null if not found.
   */
  public async update(id: string, data: Partial<User>): Promise<User | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a User instance by its ID.
   * @param id - The ID of the User to delete.
   * @returns A promise that resolves when the User is deleted.
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Verifies the credentials of a User.
   * @param email - The email of the User to verify.
   * @param password - The password of the User to verify.
   * @returns A promise that resolves to the User instance.
   */
  public async verifyCredentials(email: string, password: string): Promise<User> {
    return await User.verifyCredentials(email, password)
  }

  /**
   * Finds a User instance by their email address.
   * @param email - The email address of the User to find.
   * @returns A promise that resolves to the User instance or null if not found.
   */
  public async findByEmail(email: string): Promise<User | null> {
    return User.query().where({ email }).first()
  }

  /**
   * Finds a user by external identity provider information.
   */
  public async findByExternalIdentity(
    externalIdpId: string,
    externalUserId: string
  ): Promise<User | null> {
    return User.query()
      .where('external_idp_id', externalIdpId)
      .where('external_user_id', externalUserId)
      .first()
  }

  /**
   * Creates a JIT (Just-In-Time) provisioned user from external identity with its Owner.
   */
  public async createJITUser(
    data: CreateJITUserData,
    trx?: TransactionClientContract
  ): Promise<User> {
    return db.transaction(async (transaction) => {
      const client = trx || transaction

      // Extract username and other user data
      const { username, email, externalIdpId, externalUserId } = data

      // Create the User first with username
      const user = await User.create(
        {
          username,
          email,
          externalIdpId,
          externalUserId,
          password: null, // No local password for JIT users
          isSystemAdmin: false,
        },
        { client }
      )

      // Create the Owner entity that references this user
      await Owner.create({ userId: user.id }, { client })

      return user
    })
  }

  /**
   * Links an existing user to an external identity.
   */
  public async linkExternalIdentity(
    userId: string,
    externalIdpId: string,
    externalUserId: string
  ): Promise<User | null> {
    const user = await this.findById(userId)
    if (!user) {
      return null
    }

    user.externalIdpId = externalIdpId
    user.externalUserId = externalUserId
    await user.save()

    return user
  }

  /**
   * Finds users with admin privileges.
   */
  public async findAdmins(): Promise<User[]> {
    return User.query().where('is_system_admin', true)
  }

  /**
   * Sets or updates a user's password.
   */
  public async setPassword(userId: string, password: string): Promise<User | null> {
    const user = await this.findById(userId)
    if (!user) {
      return null
    }

    user.password = password // Will be hashed automatically by the model
    await user.save()

    return user
  }
}
