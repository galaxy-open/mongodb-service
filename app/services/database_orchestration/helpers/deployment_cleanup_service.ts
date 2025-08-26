import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DockerCliService from '#services/docker_cli/docker_cli_service'
import DatabaseInstanceRepository from '#repositories/database_instance_repository'
import DockerSwarmManager from '#models/docker_swarm_manager'
import DeploymentTypes from '#enums/deployment_types'
import DatabaseEngines from '#enums/database_engines'

/**
 * Service responsible for cleaning up Docker resources (stacks, services, secrets)
 * during failed deployments or manual cleanup operations
 */
@inject()
export default class DeploymentCleanupService {
  private static readonly MAX_SECRET_NAME_LENGTH = 64
  private static readonly COMMON_SECRET_SUFFIXES = [
    'tlscert',
    'cacert',
    'tlskey',
    'replicakey',
    'replication_password',
    'admin_password',
    'monitor_password',
    'backup_password',
  ]

  constructor(
    private logger: Logger,
    private dockerCliService: DockerCliService,
    private databaseInstanceRepository: DatabaseInstanceRepository
  ) {}

  /**
   * Attempt cleanup by database instance ID
   * Used when deployment fails and we need to clean up based on instance ID
   */
  async attemptCleanupByInstanceId(databaseInstanceId: string, originalError?: any): Promise<void> {
    try {
      const instance = await this.databaseInstanceRepository.findWithFullDetails(databaseInstanceId)

      if (!instance) {
        this.logger.warn(`Could not find database instance ${databaseInstanceId} for cleanup`)
        return
      }

      if (!instance.deployment?.dockerSwarmManager) {
        this.logger.warn(
          `No deployment/cluster information available for instance ${databaseInstanceId}. Stack may need manual cleanup.`
        )
        return
      }

      await this.cleanupStack(instance.stackName, instance.deployment.dockerSwarmManager, {
        deploymentType: instance.deploymentType,
        databaseEngine: instance.databaseEngine,
      })
    } catch (cleanupError) {
      this.logger.error(
        {
          originalError,
          cleanupError,
          databaseInstanceId,
        },
        'Failed to clean up Docker resources after deployment failure'
      )
    }
  }

  /**
   * Clean up a stack manually (used by ace commands)
   * Removes the stack and optionally its associated secrets
   */
  async cleanupStackManually(
    stackName: string,
    cluster: DockerSwarmManager,
    includeSecrets: boolean = true
  ): Promise<void> {
    try {
      this.logger.info(`Cleaning up Docker stack: ${stackName}`)

      await this.removeDockerStack(cluster, stackName)

      if (includeSecrets) {
        await this.removeCommonSecrets(cluster, stackName)
      }

      this.logger.info(`Stack cleanup completed for: ${stackName}`)
    } catch (error) {
      this.logger.error({ error, stackName }, 'Error during stack cleanup')
      throw error
    }
  }

  /**
   * Core cleanup method that removes stack and related secrets
   * Used internally for consistent cleanup logic
   */
  private async cleanupStack(
    stackName: string,
    cluster: DockerSwarmManager,
    options?: {
      deploymentType?: DeploymentTypes
      databaseEngine?: DatabaseEngines
    }
  ): Promise<void> {
    try {
      this.logger.info(`Cleaning up Docker resources for: ${stackName}`)

      // Remove the Docker stack (includes services and networks)
      await this.removeDockerStack(cluster, stackName)

      // Remove database-specific secrets if we have the context
      if (options?.deploymentType && options?.databaseEngine) {
        await this.removeDatabaseSpecificSecrets(
          cluster,
          stackName,
          options.deploymentType,
          options.databaseEngine
        )
      }

      // Always try to remove common secrets
      await this.removeCommonSecrets(cluster, stackName)

      this.logger.info('Docker resource cleanup completed')
    } catch (cleanupError) {
      this.logger.error(
        { error: cleanupError },
        'Error during Docker resource cleanup, but continuing'
      )
    }
  }

  /**
   * Remove the Docker stack
   */
  private async removeDockerStack(cluster: DockerSwarmManager, stackName: string): Promise<void> {
    try {
      await this.dockerCliService.run(cluster, (docker) => docker.stackRm(stackName))
      this.logger.info(`Removed Docker stack: ${stackName}`)
    } catch (error) {
      this.logger.warn(
        { error },
        `Failed to remove stack ${stackName}, it may not have been created`
      )
    }
  }

  /**
   * Remove database-specific secrets based on database type and deployment type
   */
  private async removeDatabaseSpecificSecrets(
    cluster: DockerSwarmManager,
    stackName: string,
    deploymentType: DeploymentTypes,
    databaseEngine: DatabaseEngines
  ): Promise<void> {
    const secrets: string[] = []

    // Only add secrets that are specific to certain configurations
    if (deploymentType === DeploymentTypes.REPLICASET) {
      if (databaseEngine === DatabaseEngines.MONGODB) {
        secrets.push(this.buildSecretName(stackName, 'replicakey'))
      }
    }

    await this.removeSecrets(cluster, secrets)
  }

  /**
   * Remove common secrets that might exist for any stack
   */
  private async removeCommonSecrets(cluster: DockerSwarmManager, stackName: string): Promise<void> {
    const secrets = DeploymentCleanupService.COMMON_SECRET_SUFFIXES.map((suffix) =>
      this.buildSecretName(stackName, suffix)
    )

    await this.removeSecrets(cluster, secrets)
  }

  /**
   * Remove multiple secrets
   */
  private async removeSecrets(cluster: DockerSwarmManager, secretNames: string[]): Promise<void> {
    for (const secretName of secretNames) {
      await this.removeSecret(cluster, secretName)
    }
  }

  /**
   * Remove a single Docker secret
   */
  private async removeSecret(cluster: DockerSwarmManager, secretName: string): Promise<void> {
    try {
      await this.dockerCliService.run(cluster, (docker) => docker.secretRm(secretName))
      this.logger.debug(`Removed secret: ${secretName}`)
    } catch (error) {
      // Secrets may not exist, which is fine
      this.logger.debug({ error }, `Secret ${secretName} not found or already removed`)
    }
  }

  /**
   * Build a Docker secret name, ensuring it doesn't exceed the max length
   */
  private buildSecretName(stackName: string, suffix: string): string {
    const fullName = `${stackName}_${suffix}`

    if (fullName.length <= DeploymentCleanupService.MAX_SECRET_NAME_LENGTH) {
      return fullName
    }

    // Truncate stack name to fit within the limit
    const suffixWithSeparator = `_${suffix}`
    const maxStackLength =
      DeploymentCleanupService.MAX_SECRET_NAME_LENGTH - suffixWithSeparator.length
    const truncatedStackName = stackName.substring(0, maxStackLength)

    return `${truncatedStackName}${suffixWithSeparator}`
  }
}
