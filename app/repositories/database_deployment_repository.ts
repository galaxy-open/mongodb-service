import DatabaseDeployment from '#models/database_deployment'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

export default class DatabaseDeploymentRepository {
  /**
   * Retrieves a paginated list of DatabaseDeployment instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<DatabaseDeployment[]> {
    const result = await DatabaseDeployment.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves a DatabaseDeployment instance by its ID.
   */
  public async findById(id: string): Promise<DatabaseDeployment | null> {
    return DatabaseDeployment.find(id)
  }

  /**
   * Retrieves a DatabaseDeployment by database instance ID.
   */
  public async findByDatabaseInstanceId(
    databaseInstanceId: string
  ): Promise<DatabaseDeployment | null> {
    return DatabaseDeployment.findBy('database_instance_id', databaseInstanceId)
  }

  /**
   * Creates a new DatabaseDeployment instance.
   */
  public async create(data: Partial<DatabaseDeployment>): Promise<DatabaseDeployment> {
    return DatabaseDeployment.create(data)
  }

  /**
   * Updates an existing DatabaseDeployment instance.
   */
  public async update(
    id: string,
    data: Partial<DatabaseDeployment>
  ): Promise<DatabaseDeployment | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Updates a DatabaseDeployment by database instance ID.
   */
  public async updateByDatabaseInstanceId(
    databaseInstanceId: string,
    data: Partial<DatabaseDeployment>
  ): Promise<DatabaseDeployment | null> {
    const modelInstance = await this.findByDatabaseInstanceId(databaseInstanceId)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Creates or updates a DatabaseDeployment instance (upsert).
   */
  public async upsert(
    databaseInstanceId: string,
    params: Partial<DatabaseDeployment> & {
      workerIds?: string[]
    },
    trx?: TransactionClientContract
  ): Promise<DatabaseDeployment> {
    const { workerIds, ...deploymentParams } = params
    const existingDeployment = await this.findByDatabaseInstanceId(databaseInstanceId)

    let deployment: DatabaseDeployment

    if (existingDeployment) {
      if (trx) {
        existingDeployment.useTransaction(trx)
      }
      existingDeployment.merge(deploymentParams)
      await existingDeployment.save()
      deployment = existingDeployment
    } else {
      const newDeployment = await this.create({
        ...deploymentParams,
        databaseInstanceId,
      })

      if (trx) {
        newDeployment.useTransaction(trx)
        await newDeployment.save()
      }
      deployment = newDeployment
    }

    // Handle worker assignments
    if (workerIds && workerIds.length > 0) {
      await this.assignWorkers(databaseInstanceId, workerIds, trx)
    }

    return deployment
  }

  /**
   * Assigns workers to a database deployment using many-to-many relationship.
   */
  public async assignWorkers(
    databaseInstanceId: string,
    workerIds: string[],
    trx?: TransactionClientContract
  ): Promise<void> {
    const deployment = await DatabaseDeployment.query()
      .where('database_instance_id', databaseInstanceId)
      .firstOrFail()

    if (trx) {
      deployment.useTransaction(trx)
    }

    // Prepare worker assignments with pivot data
    const assignedAt = DateTime.now()
    const workerAssignments = Object.fromEntries(
      workerIds.map((workerId) => [workerId, { assigned_at: assignedAt }])
    )

    // Use sync to replace all worker assignments
    await deployment.related('workers').sync(workerAssignments)
  }

  /**
   * Add workers to a database deployment without replacing existing ones.
   */
  public async addWorkers(
    databaseInstanceId: string,
    workerIds: string[],
    trx?: TransactionClientContract
  ): Promise<void> {
    const deployment = await DatabaseDeployment.query()
      .where('database_instance_id', databaseInstanceId)
      .firstOrFail()

    if (trx) {
      deployment.useTransaction(trx)
    }

    // Prepare worker assignments with pivot data
    const assignedAt = DateTime.now()
    const workerAssignments = Object.fromEntries(
      workerIds.map((workerId) => [workerId, { assigned_at: assignedAt }])
    )

    // Use attach to add workers without removing existing ones
    await deployment.related('workers').attach(workerAssignments)
  }

  /**
   * Remove workers from a database deployment.
   */
  public async removeWorkers(
    databaseInstanceId: string,
    workerIds: string[],
    trx?: TransactionClientContract
  ): Promise<void> {
    const deployment = await DatabaseDeployment.query()
      .where('database_instance_id', databaseInstanceId)
      .firstOrFail()

    if (trx) {
      deployment.useTransaction(trx)
    }

    // Use detach to remove specific workers
    await deployment.related('workers').detach(workerIds)
  }

  /**
   * Get deployment with its assigned workers.
   */
  public async findWithWorkers(databaseInstanceId: string): Promise<DatabaseDeployment | null> {
    return DatabaseDeployment.query()
      .where('database_instance_id', databaseInstanceId)
      .preload('workers', (query) => {
        query.pivotColumns(['assigned_at'])
      })
      .first()
  }

  /**
   * Deletes a DatabaseDeployment instance by its ID.
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Deletes a DatabaseDeployment by database instance ID.
   */
  public async deleteByDatabaseInstanceId(databaseInstanceId: string): Promise<void> {
    const modelInstance = await this.findByDatabaseInstanceId(databaseInstanceId)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Finds deployments with backup enabled.
   */
  public async findWithBackupEnabled(): Promise<DatabaseDeployment[]> {
    return DatabaseDeployment.query().where('backup_enabled', true)
  }
}
