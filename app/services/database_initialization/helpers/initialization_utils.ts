import { DatabaseUser, InitializationResult } from '#interfaces/database_initialization'
import { DatabaseConstants } from '#services/database_initialization/config/database_constants'
import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'
import logger from '@adonisjs/core/services/logger'

/**
 * Common utilities for database initialization to reduce duplication.
 */
export class InitializationUtils {
  constructor() {}
  /**
   * Handle the standard post-connection delay to ensure database is fully ready.
   */
  static async handlePostConnectionDelay(databaseEngine: DatabaseEngines): Promise<void> {
    logger.debug(
      `Waiting ${DatabaseConstants.TIMEOUTS.POST_CONNECTION_DELAY / 1000} seconds for ${databaseEngine} to be fully ready`
    )
    await new Promise((resolve) =>
      setTimeout(resolve, DatabaseConstants.TIMEOUTS.POST_CONNECTION_DELAY)
    )
  }

  /**
   * Build standard initialization result object.
   */
  static buildInitializationResult(
    connectionUri: string,
    users: DatabaseUser[]
  ): InitializationResult {
    return {
      connectionUri,
      users,
      status: 'initialized',
    }
  }

  static buildInitializationFailure(error: Error): InitializationResult {
    return {
      connectionUri: '',
      users: [],
      status: 'failed',
      error: error.message,
    }
  }

  /**
   * Log initialization start with consistent format.
   */
  static logInitializationStart(
    databaseEngine: DatabaseEngines,
    deploymentType: DeploymentTypes
  ): void {
    logger.info(`Starting ${databaseEngine} ${deploymentType} initialization`)
  }

  /**
   * Log initialization completion with consistent format.
   */
  static logInitializationComplete(
    databaseEngine: DatabaseEngines,
    deploymentType: DeploymentTypes
  ): void {
    logger.info(`${databaseEngine} ${deploymentType} initialization completed successfully`)
  }
}
