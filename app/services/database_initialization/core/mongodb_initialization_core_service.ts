import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'

import {
  DatabaseUser,
  DatabaseUserSpec,
  InitializationParams,
  InitializationResult,
} from '#interfaces/database_initialization'
import MongoDBDriverService from '#services/database_initialization/driver/mongodb_driver_service'
import DatabaseConnectionBuilderService from '#services/database_connection_builder/database_connection_builder_service'
import MongoDBSetupService from '#services/database_initialization/setup/mongodb_setup_service'
import MongoDBUserSpecFactory from '#services/database_initialization/config/mongodb_user_spec_factory'
import { InitializationUtils } from '#services/database_initialization/helpers/initialization_utils'

/**
 * Core service for MongoDB initialization orchestration.
 */
@inject()
export default class MongoDBInitializationCoreService {
  constructor(
    private logger: Logger,
    private mongoDBDriverService: MongoDBDriverService,
    private databaseConnectionBuilder: DatabaseConnectionBuilderService,
    private mongodbSetupService: MongoDBSetupService
  ) {}

  async initialize(params: InitializationParams): Promise<InitializationResult> {
    try {
      InitializationUtils.logInitializationStart(params.databaseEngine, params.deploymentType)

      // Handle deployment-specific setup using unified service
      await this.mongodbSetupService.setup(params, params.deploymentType)

      const connectionUri = this.databaseConnectionBuilder.buildInitializationConnection(
        params.databaseEngine,
        params,
        params.deploymentType
      )
      this.logger.info('Connection URI built')

      await this.mongodbSetupService.validateConnection(connectionUri, params.deploymentType)
      this.logger.info('Connection validated')

      // Add delay to ensure MongoDB is fully ready
      await InitializationUtils.handlePostConnectionDelay(params.databaseEngine)

      const users = await this.createUsers(connectionUri, params)
      this.logger.info({ userCount: users.length }, 'Users created successfully')

      const result = InitializationUtils.buildInitializationResult(connectionUri, users)
      InitializationUtils.logInitializationComplete(params.databaseEngine, params.deploymentType)

      return result
    } catch (error) {
      this.logger.error(
        {
          error,
          stackName: params.stackName,
          deploymentType: params.deploymentType,
          databaseInstanceId: params.databaseInstanceId,
        },
        `MongoDB ${params.deploymentType} initialization failed`
      )
      return InitializationUtils.buildInitializationFailure(error as Error)
    }
  }

  private async createUsers(
    connectionUri: string,
    params: InitializationParams
  ): Promise<DatabaseUser[]> {
    this.logger.info(`Creating MongoDB users for ${params.deploymentType} deployment`)

    // Get default user specifications from factory
    const userSpecs = MongoDBUserSpecFactory.getDefaultUserSpecs(
      params.adminPassword,
      params.monitorPassword,
      params.backupPassword
    )

    this.logger.debug(
      {
        userCount: userSpecs.length,
        usernames: userSpecs.map((spec: DatabaseUserSpec) => spec.username),
      },
      `Creating users with specifications for ${params.deploymentType}`
    )

    // Create all users using mongodb driver with transactions
    const users = await this.mongoDBDriverService.createUsersWithTransaction(
      connectionUri,
      userSpecs
    )

    this.logger.info(
      `Successfully created all MongoDB users for ${params.deploymentType} deployment`
    )

    return users
  }
}
