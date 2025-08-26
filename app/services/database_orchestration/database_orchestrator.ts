import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import { DeploymentParams } from '#services/database_orchestration/types/deployment_types'
import MongoDBDeploymentOrchestrator from '#services/database_orchestration/orchestrators/mongodb_deployment_orchestrator'
import DatabaseDeletionOrchestrator, {
  DeletionParams,
} from '#services/database_orchestration/orchestrators/database_deletion_orchestrator'

@inject()
export default class DatabaseOrchestrator {
  constructor(
    protected logger: Logger,
    protected mongodbDeploymentOrchestrator: MongoDBDeploymentOrchestrator,
    protected databaseDeletionOrchestrator: DatabaseDeletionOrchestrator
  ) {}

  async createMongoDB(params: DeploymentParams): Promise<void> {
    try {
      await this.mongodbDeploymentOrchestrator.deploy(params)
    } catch (e) {
      this.logger.error(
        { e, deploymentType: params.deploymentType },
        'Something went wrong while creating the MongoDB database'
      )
      throw e
    }
  }

  async deleteDatabase(params: DeletionParams): Promise<void> {
    try {
      await this.databaseDeletionOrchestrator.delete(params)
    } catch (e) {
      this.logger.error(
        { e, databaseInstanceId: params.databaseInstanceId },
        'Something went wrong while deleting the database'
      )
      throw e
    }
  }
}
