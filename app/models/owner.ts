import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'
import DatabaseInstance from '#models/database_instance'
import JobHistory from '#models/job_history'

export default class Owner extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string | null

  @column()
  declare organizationId: string | null

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serialize: (value: DateTime) => value.toISO(),
  })
  declare updatedAt: DateTime

  /**
   * Belongs to User (when this owner represents a user)
   */
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  /**
   * Belongs to Organization (when this owner represents an organization)
   */
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * One-to-many relationship with DatabaseInstance
   */
  @hasMany(() => DatabaseInstance, { foreignKey: 'ownerId' })
  declare databaseInstances: HasMany<typeof DatabaseInstance>

  /**
   * One-to-many relationship with JobHistory
   */
  @hasMany(() => JobHistory, { foreignKey: 'ownerId' })
  declare jobHistory: HasMany<typeof JobHistory>

  /**
   * Get the actual owner entity (User or Organization)
   */
  static async getActualOwner(
    userId?: string,
    organizationId?: string
  ): Promise<User | Organization> {
    if (userId) {
      return await User.findOrFail(userId)
    }
    return await Organization.findOrFail(organizationId)
  }
}
