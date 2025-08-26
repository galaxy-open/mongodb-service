import PasswordResetToken from '#models/password_reset_token'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class PasswordResetTokenRepository {
  /**
   * Retrieves a paginated list of PasswordResetToken instances.
   * @param page - The page number to retrieve.
   * @param limit - The number of items per page.
   * @returns A promise that resolves to an array of PasswordResetToken instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<PasswordResetToken[]> {
    return PasswordResetToken.query().paginate(page, limit)
  }

  /**
   * Retrieves a PasswordResetToken instance by its ID.
   * @param id - The ID of the PasswordResetToken to retrieve.
   * @returns A promise that resolves to the PasswordResetToken instance or null if not found.
   */
  public async findById(id: string): Promise<PasswordResetToken | null> {
    return PasswordResetToken.find(id)
  }

  /**
   * Creates a new PasswordResetToken instance.
   * @param data - The data to create the PasswordResetToken with.
   * @returns A promise that resolves to the created PasswordResetToken instance.
   */
  public async create(data: Partial<PasswordResetToken>): Promise<PasswordResetToken> {
    return PasswordResetToken.create(data)
  }

  /**
   * Updates an existing PasswordResetToken instance.
   * @param id - The ID of the PasswordResetToken to update.
   * @param data - The data to update the PasswordResetToken with.
   * @returns A promise that resolves to the updated PasswordResetToken instance or null if not found.
   */
  public async update(
    id: string,
    data: Partial<PasswordResetToken>
  ): Promise<PasswordResetToken | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a PasswordResetToken instance by its ID.
   * @param id - The ID of the PasswordResetToken to delete.
   * @returns A promise that resolves when the PasswordResetToken is deleted.
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Retrieves a PasswordResetToken instance by its value.
   * @param value - The value of the PasswordResetToken to retrieve.
   * @returns A promise that resolves to the PasswordResetToken instance and the user instance or null if not found.
   */
  public async findByValue(
    value: string
  ): Promise<{ token: PasswordResetToken | null; user?: User | null }> {
    const token = await PasswordResetToken.findBy({ value })
    const user = await token?.related('user').query().first()

    return {
      token,
      user,
    }
  }

  /**
   * Expires the password reset tokens of a User.
   * @param userId - The ID of the User to expire the password reset tokens of.
   * @returns A promise that resolves when the password reset tokens are expired.
   */
  public async expire(userId: string | number) {
    await PasswordResetToken.query()
      .where('userId', userId)
      .where('expiresAt', '>=', DateTime.now().toSQL())
      .update({
        expiresAt: DateTime.now().toSQL(),
        updatedAt: DateTime.now().toSQL(),
      })
  }
}
