import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DeploymentTypes from '#enums/deployment_types'
import ServiceHealthMonitor from '#services/infrastructure/health/service_health_monitor'
import { InitializationParams } from '#interfaces/database_initialization'
import { DatabaseConstants } from '#services/database_initialization/config/database_constants'
import { HealthCheckUtils } from '#services/database_initialization/helpers/health_check_utils'

/**
 * Utility for checking MongoDB service health.
 * Handles health monitoring for different deployment types.
 */
@inject()
export default class MongoDBHealthChecker {
  constructor(
    private logger: Logger,
    private serviceHealthMonitor: ServiceHealthMonitor
  ) {}

  /**
   * Wait for MongoDB service to become healthy based on deployment type.
   */
  async waitForServiceHealth(
    params: InitializationParams,
    deploymentType: DeploymentTypes
  ): Promise<void> {
    switch (deploymentType) {
      case DeploymentTypes.STANDALONE:
        return this.waitForStandaloneService(params)
      case DeploymentTypes.REPLICASET:
        return this.waitForReplicaSetServices(params)
      default:
        throw new Error(`Unsupported deployment type: ${deploymentType}`)
    }
  }

  /**
   * Wait for standalone MongoDB service to become healthy.
   */
  private async waitForStandaloneService(params: InitializationParams): Promise<void> {
    const serviceName = DatabaseConstants.MONGODB.SERVICE_NAMES.STANDALONE(params.stackName)

    return HealthCheckUtils.waitForStandaloneService(
      this.serviceHealthMonitor,
      params,
      serviceName,
      params.databaseEngine
    )
  }

  /**
   * Wait for all replica set services to become healthy.
   */
  private async waitForReplicaSetServices(params: InitializationParams): Promise<void> {
    const replicaCount = params.hostnames.length

    this.logger.info({ replicaCount }, 'Waiting for all replica set MongoDB services health')

    const healthConfigs = this.buildReplicaHealthConfigs(params, replicaCount)

    const allHealthy = await this.serviceHealthMonitor.waitForMultipleServicesHealthy(
      params.cluster,
      healthConfigs
    )

    if (!allHealthy) {
      throw new Error('One or more replica services failed to become healthy within timeout period')
    }

    this.logger.info({ replicaCount }, 'All replica set MongoDB services are healthy')
  }

  /**
   * Build health check configurations for all replica services.
   */
  private buildReplicaHealthConfigs(params: InitializationParams, replicaCount: number) {
    const configs = []

    for (let i = 1; i <= replicaCount; i++) {
      const serviceName = `${params.stackName}_${i}`

      this.logger.info(`Will check health for replica service: ${serviceName}`)

      configs.push({
        stackName: params.stackName,
        serviceName,
        timeoutMs: DatabaseConstants.TIMEOUTS.HEALTH_CHECK,
        checkIntervalMs: DatabaseConstants.TIMEOUTS.HEALTH_CHECK_INTERVAL,
      })
    }

    return configs
  }
}
