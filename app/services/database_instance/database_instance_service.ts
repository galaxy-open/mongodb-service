import { inject } from '@adonisjs/core'
import DatabaseInstance from '#models/database_instance'
import DatabaseInstanceManager from '#services/database_instance/managers/database_instance_manager'
import DatabaseJobDispatcher from '#services/database_instance/dispatchers/database_job_dispatcher'
import StackNameGenerator from '#services/database_instance/helpers/stack_name_generator'
import { IhttpOwner } from '#interfaces/http_owner'
import { DatabaseInstanceContext } from '#interfaces/database_instance'
import InstanceSizeService from '#services/instance_size_service'
import {
  createDatabaseInstanceValidator,
  updateDatabaseInstanceValidator,
} from '#validators/database_instances'
import { Infer } from '@vinejs/vine/types'

export type CreateDatabaseInstanceData = Infer<typeof createDatabaseInstanceValidator>
export type UpdateDatabaseInstanceData = Omit<
  Infer<typeof updateDatabaseInstanceValidator>,
  'params'
>

@inject()
export default class DatabaseInstanceService {
  constructor(
    protected databaseInstanceManager: DatabaseInstanceManager,
    protected databaseJobDispatcher: DatabaseJobDispatcher,
    protected instanceSizeService: InstanceSizeService,
    protected stackNameGenerator: StackNameGenerator
  ) {}

  /**
   * Creates a database within token context
   */
  async createInContext(
    { instanceSize, ...data }: CreateDatabaseInstanceData,
    owner: IhttpOwner
  ): Promise<DatabaseInstance> {
    const stackName = await this.stackNameGenerator.generateUniqueStackName()

    const instanceSizeModel =
      await this.instanceSizeService.findByNameAndDatabaseEngineAndDeploymentType(
        instanceSize,
        data.databaseEngine,
        data.deploymentType
      )

    const databaseInstance = await this.databaseInstanceManager.createInContext(
      { ...data, instanceSizeId: instanceSizeModel.id, stackName },
      owner.id,
      owner.userId
    )

    await this.databaseJobDispatcher.dispatchCreate(databaseInstance, owner.userId)
    return databaseInstance
  }

  /**
   * Lists all databases within token context with optional Docker information
   */
  async listInContext(ownerId: string): Promise<DatabaseInstance[]> {
    return this.databaseInstanceManager.listInContext(ownerId)
  }

  /**
   * Finds a database by ID within token context
   */
  async findByIdInContext(context: DatabaseInstanceContext): Promise<DatabaseInstance | null> {
    return this.databaseInstanceManager.findByIdInContext(context)
  }

  /**
   * Finds a database with full details by ID within token context
   */
  async findWithFullDetailsInContext(
    context: DatabaseInstanceContext
  ): Promise<DatabaseInstance | null> {
    return this.databaseInstanceManager.findWithFullDetailsInContext(context)
  }

  /**
   * Updates a database within token context
   */
  async updateInContext(
    context: DatabaseInstanceContext,
    data: UpdateDatabaseInstanceData
  ): Promise<DatabaseInstance | null> {
    let processedData: Partial<DatabaseInstance> = { ...data }

    if (data.instanceSize) {
      const existing = await this.databaseInstanceManager.findByIdInContext(context)
      if (existing) {
        const instanceSizeModel =
          await this.instanceSizeService.findByNameAndDatabaseEngineAndDeploymentType(
            data.instanceSize,
            existing.databaseEngine,
            existing.deploymentType
          )
        const { instanceSize, ...restData } = data
        processedData = { ...restData, instanceSizeId: instanceSizeModel.id }
      }
    }

    const updated = await this.databaseInstanceManager.updateInContext(context, processedData)

    if (updated) {
      await this.databaseJobDispatcher.dispatchUpdate(updated)
    }

    return updated
  }

  /**
   * Deletes a database within token context
   */
  async deleteInContext(context: DatabaseInstanceContext): Promise<boolean> {
    const updated = await this.databaseInstanceManager.markAsDeleting(context)

    if (updated) {
      await this.databaseJobDispatcher.dispatchDelete(updated)
      return true
    }

    return false
  }
}
