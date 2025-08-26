import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import DatabaseInstance from '#models/database_instance'
import DatabaseInstanceRepository from '#repositories/database_instance_repository'
import InstanceStatus from '#enums/instance_status'
import { DatabaseInstanceContext } from '#interfaces/database_instance'

@inject()
export default class DatabaseInstanceManager {
  constructor(protected databaseInstanceRepository: DatabaseInstanceRepository) {}

  /**
   * Creates a database instance within token context
   */
  async createInContext(
    data: Partial<DatabaseInstance>,
    ownerId: string,
    userId: string
  ): Promise<DatabaseInstance> {
    return await this.databaseInstanceRepository.createInContext(
      { ...data, status: InstanceStatus.PROVISIONING },
      ownerId,
      userId
    )
  }

  /**
   * Lists all databases within token context with optional Docker information
   */
  async listInContext(ownerId: string): Promise<DatabaseInstance[]> {
    return this.databaseInstanceRepository.findAllInContext(ownerId)
  }

  /**
   * Finds a database by ID within token context
   */
  async findByIdInContext(context: DatabaseInstanceContext): Promise<DatabaseInstance | null> {
    const database = await this.databaseInstanceRepository.findByIdInContext(
      context.id,
      context.ownerId
    )

    if (!database) {
      return null
    }

    return database
  }

  /**
   * Finds a database with full details by ID within token context
   */
  async findWithFullDetailsInContext(
    context: DatabaseInstanceContext
  ): Promise<DatabaseInstance | null> {
    return this.databaseInstanceRepository.findWithFullDetailsInContext(context.id, context.ownerId)
  }

  /**
   * Updates a database within token context
   */
  async updateInContext(
    context: DatabaseInstanceContext,
    data: Partial<DatabaseInstance>
  ): Promise<DatabaseInstance | null> {
    return await this.databaseInstanceRepository.updateInContext(context.id, data, context.ownerId)
  }

  /**
   * Marks a database as deleting within token context
   */
  async markAsDeleting(context: DatabaseInstanceContext): Promise<DatabaseInstance | null> {
    const scheduledDeletionAt = DateTime.now()

    return await this.databaseInstanceRepository.updateInContext(
      context.id,
      {
        status: InstanceStatus.DELETING,
        scheduledDeletionAt,
      },
      context.ownerId
    )
  }
}
