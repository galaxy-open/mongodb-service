import DatabaseInstance from '#models/database_instance'
import InstanceStatus from '#enums/instance_status'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { ContainerCountCalculator } from '#services/container_count_calculator'

export default class DatabaseInstanceRepository {
  /**
   * Retrieves a paginated list of DatabaseInstance instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<DatabaseInstance[]> {
    const result = await DatabaseInstance.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves a DatabaseInstance instance by its ID.
   */
  public async findById(id: string): Promise<DatabaseInstance> {
    return DatabaseInstance.findOrFail(id)
  }

  public async findByIdWithsize(id: string): Promise<DatabaseInstance> {
    const instance = await DatabaseInstance.query()
      .where('id', id)
      .preload('size')
      .preload('region')
      .preload('version')
      .first()
    if (!instance) {
      throw new Error(`DatabaseInstance with id ${id} not found`)
    }

    return instance
  }

  /**
   * Retrieves a DatabaseInstance by ID within token context (ownership-scoped)
   * Returns null if not found in context
   */
  public async findByIdInContext(id: string, ownerId: string): Promise<DatabaseInstance> {
    const db = await DatabaseInstance.query()
      .where('id', id)
      .where('owner_id', ownerId)
      .preload('size')
      .first()
    if (!db) {
      throw new Error(`DatabaseInstance with id ${id} not found in context`)
    }
    return db
  }

  /**
   * Retrieves all DatabaseInstance instances within token context (ownership-scoped)
   */
  public async findAllInContext(ownerId: string): Promise<DatabaseInstance[]> {
    return DatabaseInstance.query()
      .where('owner_id', ownerId)
      .preload('size')
      .preload('region')
      .preload('version')
  }

  public async countInContext(ownerId: string): Promise<number> {
    const result = await DatabaseInstance.query().where('owner_id', ownerId).count('* as total')
    return Number(result[0].$extras.total)
  }

  public async countByStatusInContext(ownerId: string, status: InstanceStatus): Promise<number> {
    const result = await DatabaseInstance.query()
      .where('owner_id', ownerId)
      .where('status', status)
      .count('* as total')
    return Number(result[0].$extras.total)
  }

  /**
   * Creates a new DatabaseInstance instance within token context
   */
  public async createInContext(
    data: Partial<DatabaseInstance>,
    ownerId: string,
    createdByUserId: string
  ): Promise<DatabaseInstance> {
    const stackNameExists = await DatabaseInstance.query()
      .where('stack_name', data.stackName!)
      .first()
    if (stackNameExists) {
      throw new Error('Stack name already exists')
    }

    const containerCount = ContainerCountCalculator.calculate(
      data.databaseEngine!,
      data.deploymentType!
    )

    return DatabaseInstance.create({
      ...data,
      ownerId,
      containerCount,
      createdByUserId, // Audit trail
    })
  }

  /**
   * Updates an existing DatabaseInstance instance within token context
   */
  public async updateInContext(
    id: string,
    data: Partial<DatabaseInstance>,
    ownerId: string
  ): Promise<DatabaseInstance | null> {
    const modelInstance = await this.findByIdInContext(id, ownerId)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a DatabaseInstance instance by its ID within token context
   */
  public async deleteInContext(id: string, ownerId: string): Promise<boolean> {
    const modelInstance = await this.findByIdInContext(id, ownerId)
    if (modelInstance) {
      await modelInstance.delete()
      return true
    }
    return false
  }

  /**
   * Creates a new DatabaseInstance instance (general - not context-scoped)
   */
  public async create(data: Partial<DatabaseInstance>): Promise<DatabaseInstance> {
    return DatabaseInstance.create(data)
  }

  /**
   * Updates an existing DatabaseInstance instance (general - not context-scoped)
   */
  public async update(
    id: string,
    data: Partial<DatabaseInstance>,
    trx?: TransactionClientContract
  ): Promise<DatabaseInstance | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    if (trx) {
      modelInstance.useTransaction(trx)
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a DatabaseInstance instance by its ID (general - not context-scoped)
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  async findByStackName(stackName: string): Promise<DatabaseInstance | null> {
    return await DatabaseInstance.findBy('stack_name', stackName)
  }

  async findWithFullDetails(id: string): Promise<DatabaseInstance | null> {
    return await DatabaseInstance.query()
      .where('id', id)
      .preload('size')
      .preload('region')
      .preload('version')
      .preload('createdBy')
      .preload('connection')
      .preload('deployment', (deploymentQuery) => {
        deploymentQuery.preload('dockerSwarmManager')
      })
      .preload('backups')
      .preload('jobHistory')
      .first()
  }

  /**
   * Find database with full details within token context
   */
  async findWithFullDetailsInContext(
    id: string,
    ownerId: string
  ): Promise<DatabaseInstance | null> {
    return await DatabaseInstance.query()
      .where('id', id)
      .where('owner_id', ownerId)
      .preload('size')
      .preload('region')
      .preload('version')
      .preload('createdBy')
      .preload('owner')
      .preload('connection')
      .preload('deployment', (deploymentQuery) => {
        deploymentQuery.preload('dockerSwarmManager')
      })
      .preload('backups')
      .preload('jobHistory')
      .first()
  }

  async findByStatus(status: InstanceStatus): Promise<DatabaseInstance[]> {
    return await DatabaseInstance.query()
      .where('status', status)
      .preload('region')
      .preload('size')
      .preload('version')
  }

  async findBillableByOwner(ownerId: string): Promise<DatabaseInstance[]> {
    return await DatabaseInstance.query()
      .where('owner_id', ownerId)
      .whereNotIn('status', [InstanceStatus.DELETED, InstanceStatus.FAILED])
      .preload('size')
  }

  async findProvisioningInstances(): Promise<DatabaseInstance[]> {
    return await DatabaseInstance.query()
      .whereIn('status', [
        InstanceStatus.REQUESTED,
        InstanceStatus.PROVISIONING,
        InstanceStatus.DEPLOYING,
      ])
      .preload('region')
      .preload('size')
      .preload('version')
  }
}
