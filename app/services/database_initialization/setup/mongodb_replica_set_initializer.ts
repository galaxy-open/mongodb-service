import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import RetryHelper from '#services/utilities/retry_helper'
import DeploymentTypes from '#enums/deployment_types'
import { InitializationParams } from '#interfaces/database_initialization'
import { DatabaseConstants } from '#services/database_initialization/config/database_constants'
import MongoDBDriverService from '#services/database_initialization/driver/mongodb_driver_service'
import DatabaseConnectionBuilderService from '#services/database_connection_builder/database_connection_builder_service'
import DatabaseEngines from '#enums/database_engines'

@inject()
export default class ReplicaSetInitializer {
  constructor(
    private logger: Logger,
    private mongoDBDriverService: MongoDBDriverService,
    private databaseConnectionBuilder: DatabaseConnectionBuilderService,
    private retryHelper: RetryHelper
  ) {}

  /**
   * Initialize MongoDB replica set with proper configuration.
   */
  async initialize(params: InitializationParams): Promise<void> {
    this.validateParams(params)

    const replicaSetConfig = this.buildConfiguration(params)

    await this.waitForReadiness()
    await this.executeInitialization(params, replicaSetConfig)
    await this.waitForPrimaryElection(params)
  }

  /**
   * Validate replica set is working properly after initialization.
   */
  async validate(params: InitializationParams): Promise<void> {
    this.logger.info('Validating replica set status after initialization')

    const connectionUri = this.databaseConnectionBuilder.buildInitializationConnection(
      params.databaseEngine,
      params,
      DeploymentTypes.REPLICASET
    )

    const timeout = DatabaseConstants.TIMEOUTS.PRIMARY_ELECTION_TIMEOUT
    const checkInterval = DatabaseConstants.TIMEOUTS.PRIMARY_ELECTION_INTERVAL
    const maxAttempts = Math.ceil(timeout / checkInterval)

    await this.retryHelper.execute(
      async () => {
        await this.mongoDBDriverService.validateReplicaSetStatus(connectionUri)
      },
      {
        maxAttempts,
        delayMs: checkInterval,
        operation: 'replica set status validation',
      }
    )

    this.logger.info('Replica set status validation successful')
  }

  /**
   * Validate initialization parameters.
   */
  private validateParams(params: InitializationParams): void {
    if (!params.replicaSetName) {
      throw new Error('Replica set name is required for replica set initialization')
    }
  }

  /**
   * Build replica set configuration.
   */
  private buildConfiguration(params: InitializationParams) {
    this.logger.info(
      {
        replicaSetName: params.replicaSetName,
        memberCount: params.hostnames.length,
      },
      'Building MongoDB replica set configuration'
    )

    const config = {
      _id: params.replicaSetName,
      members: params.hostnames.map((hostname, index) => ({
        _id: index,
        host: `${hostname}:${params.port}`,
        priority: index === 0 ? 2 : 1, // First member has higher priority
      })),
    }

    this.logger.debug({ replicaSetConfig: config }, 'Built replica set configuration')
    return config
  }

  /**
   * Wait for MongoDB to be ready for initialization.
   */
  private async waitForReadiness(): Promise<void> {
    const initDelay = 30000 // 30 seconds, following Go code pattern
    this.logger.info(
      `Waiting ${initDelay / 1000} seconds for MongoDB to be ready for replica set initialization`
    )
    await new Promise((resolve) => setTimeout(resolve, initDelay))
  }

  /**
   * Execute replica set initialization command.
   */
  private async executeInitialization(
    params: InitializationParams,
    replicaSetConfig: any
  ): Promise<void> {
    try {
      await this.retryHelper.execute(
        async () => {
          // For direct connection, use first hostname only (not full replica set URI)
          const primaryHostnameUri = `${params.hostnames[0]}:${params.port}`
          const authUri = this.databaseConnectionBuilder.buildDirectConnection(
            DatabaseEngines.MONGODB,
            primaryHostnameUri,
            params.adminPassword
          )
          await this.mongoDBDriverService.executeAdminCommand(authUri, {
            replSetInitiate: replicaSetConfig,
          })
        },
        {
          maxAttempts: 5,
          delayMs: 10000,
          operation: 'replica set initialization',
        }
      )
    } catch (error: any) {
      // Check if the error is about replica set already being initialized
      if (
        error.message?.includes('already initialized') ||
        error.message?.includes('AlreadyInitialized')
      ) {
        this.logger.info('Replica set is already initialized, skipping initialization')
        return
      }
      throw error
    }

    this.logger.info('Replica set rs.initiate() command executed successfully')
  }

  /**
   * Wait for replica set primary election to complete.
   */
  private async waitForPrimaryElection(params: InitializationParams): Promise<void> {
    this.logger.info('Waiting for replica set primary election')

    const timeout = DatabaseConstants.TIMEOUTS.PRIMARY_ELECTION_TIMEOUT
    const checkInterval = DatabaseConstants.TIMEOUTS.PRIMARY_ELECTION_INTERVAL
    const maxAttempts = Math.ceil(timeout / checkInterval)

    await this.retryHelper.execute(
      async () => {
        // For direct connection, use first hostname only (not full replica set URI)
        const primaryHostnameUri = `${params.hostnames[0]}:${params.port}`
        const connectionUri = this.databaseConnectionBuilder.buildDirectConnection(
          DatabaseEngines.MONGODB,
          primaryHostnameUri,
          params.adminPassword
        )
        const result = await this.mongoDBDriverService.executeAdminCommand(connectionUri, {
          replSetGetStatus: 1,
        })

        // Check if this member is primary (state 1) or secondary (state 2)
        if (result.myState === 1 || result.myState === 2) {
          return // Success
        }

        throw new Error('Primary not elected yet')
      },
      {
        maxAttempts,
        delayMs: checkInterval,
        operation: 'replica set primary election',
      }
    )
  }
}
