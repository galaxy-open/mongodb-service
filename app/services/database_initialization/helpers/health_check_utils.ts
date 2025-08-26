import ServiceHealthMonitor from '#services/infrastructure/health/service_health_monitor'
import { InitializationParams } from '#interfaces/database_initialization'
import { DatabaseConstants } from '#services/database_initialization/config/database_constants'
import DatabaseEngines from '#enums/database_engines'
import logger from '@adonisjs/core/services/logger'

/**
 * Common utilities for database health checking to reduce duplication.
 */
export class HealthCheckUtils {
  /**
   * Wait for standalone database service to become healthy.
   * Generic implementation that works for any database type.
   */
  static async waitForStandaloneService(
    serviceHealthMonitor: ServiceHealthMonitor,
    params: InitializationParams,
    serviceName: string,
    databaseEngine: DatabaseEngines
  ): Promise<void> {
    logger.info(`Waiting for standalone ${databaseEngine} service health`)

    const isHealthy = await serviceHealthMonitor.waitForServiceHealthy(params.cluster, {
      stackName: params.stackName,
      serviceName,
      timeoutMs: DatabaseConstants.TIMEOUTS.HEALTH_CHECK,
      checkIntervalMs: DatabaseConstants.TIMEOUTS.HEALTH_CHECK_INTERVAL,
    })

    if (!isHealthy) {
      throw new Error(
        `Standalone ${databaseEngine} service ${serviceName} failed to become healthy within timeout period`
      )
    }

    logger.info({ serviceName }, `Standalone ${databaseEngine} service is healthy`)
  }
}
