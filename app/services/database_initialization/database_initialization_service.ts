import { Logger } from '@adonisjs/core/logger'
import { inject } from '@adonisjs/core'
import { Duration } from 'luxon'
import DatabaseInstanceRepository from '#repositories/database_instance_repository'
import InstanceStatus from '#enums/instance_status'
import DatabaseEngines from '#enums/database_engines'
import { InitializationParams } from '#interfaces/database_initialization'
import MongoDBInitializationCoreService from '#services/database_initialization/core/mongodb_initialization_core_service'

/**
 * Main Database initialization service that orchestrates the entire initialization process.
 * Acts as the main entry point for Database cluster initialization.
 */
@inject()
export default class DatabaseInitializationService {
  constructor(
    protected logger: Logger,
    protected mongodbInitializationCoreService: MongoDBInitializationCoreService,
    protected databaseInstanceRepository: DatabaseInstanceRepository
  ) {}

  async initialize(params: InitializationParams): Promise<void> {
    const startTime = Date.now()
    this.logger.info(`Starting ${params.databaseEngine} initialization`)
    const dbInitializerConfig = this.getDBInitializerConfig(params.databaseEngine)

    try {
      await this.updateDatabaseInstanceStatus(params.databaseInstanceId, InstanceStatus.DEPLOYING)

      const result = await dbInitializerConfig.initialize(params)

      if (result.status !== 'initialized') {
        throw new Error(result.error || 'Unknown initialization error')
      }

      await this.updateDatabaseInstanceStatus(params.databaseInstanceId, InstanceStatus.RUNNING)
      this.logger.info(`${params.databaseEngine} initialization completed`)
    } catch (error) {
      const duration = Date.now() - startTime
      this.logger.error(
        {
          error,
          databaseInstanceId: params.databaseInstanceId,
          duration: Duration.fromMillis(duration).toFormat('m:ss'),
        },
        `${params.databaseEngine} initialization failed`
      )

      await this.updateDatabaseInstanceStatus(params.databaseInstanceId, InstanceStatus.FAILED)

      throw new Error(`${params.databaseEngine} initialization failed: ${error.message}`)
    }
  }

  private async updateDatabaseInstanceStatus(
    databaseInstanceId: string,
    status: InstanceStatus
  ): Promise<void> {
    try {
      await this.databaseInstanceRepository.update(databaseInstanceId, { status })
      this.logger.debug({ databaseInstanceId, status }, 'Database instance status updated')
    } catch (error) {
      this.logger.error(
        { error, databaseInstanceId, status },
        'Failed to update database instance status'
      )
    }
  }

  private getDBInitializerConfig(databaseEngine: DatabaseEngines) {
    switch (databaseEngine) {
      case DatabaseEngines.MONGODB:
        return this.mongodbInitializationCoreService
      default:
        throw new Error(`Unsupported database engine: ${databaseEngine}`)
    }
  }
}
