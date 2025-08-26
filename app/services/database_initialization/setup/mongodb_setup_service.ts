import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DeploymentTypes from '#enums/deployment_types'
import RetryHelper from '#services/utilities/retry_helper'
import MongoDBHealthChecker from './mongodb_health_checker.js'
import { InitializationParams } from '#interfaces/database_initialization'
import ReplicaSetInitializer from '#services/database_initialization/setup/mongodb_replica_set_initializer'
import MongoDBDriverService from '#services/database_initialization/driver/mongodb_driver_service'
import { DatabaseConstants } from '#services/database_initialization/config/database_constants'

@inject()
export default class MongoDBSetupService {
  constructor(
    private logger: Logger,
    private mongoDBDriverService: MongoDBDriverService,
    private healthChecker: MongoDBHealthChecker,
    private replicaSetInitializer: ReplicaSetInitializer,
    private retryHelper: RetryHelper
  ) {}

  async setup(params: InitializationParams, deploymentType: DeploymentTypes): Promise<void> {
    this.logger.info(`Starting ${deploymentType} MongoDB setup`)

    await this.healthChecker.waitForServiceHealth(params, deploymentType)
    this.logger.info(`${deploymentType} MongoDB service is healthy`)

    await this.initializeReplicaSetIfNeeded(params, deploymentType)

    this.logger.info(`${deploymentType} MongoDB setup completed`)
  }

  async validateConnection(connectionUri: string, deploymentType: DeploymentTypes): Promise<void> {
    await this.retryHelper.execute(() => this.mongoDBDriverService.listCollections(connectionUri), {
      maxAttempts: DatabaseConstants.TIMEOUTS.VALIDATION_RETRY_ATTEMPTS,
      delayMs: DatabaseConstants.TIMEOUTS.VALIDATION_RETRY_DELAY,
      operation: `${deploymentType} MongoDB validation`,
    })
  }

  async initializeReplicaSetIfNeeded(
    params: InitializationParams,
    deploymentType: DeploymentTypes
  ) {
    if (deploymentType === DeploymentTypes.REPLICASET) {
      await this.replicaSetInitializer.initialize(params)
      this.logger.info('Replica set initialized successfully')

      await this.replicaSetInitializer.validate(params)
      this.logger.info('Replica set validation completed successfully')
    }
  }
}
