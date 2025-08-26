import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DatabaseInstanceRepository from '#repositories/database_instance_repository'
import DockerCliService from '#services/docker_cli/docker_cli_service'
import DatabaseInstance from '#models/database_instance'
import DockerSwarmManager from '#models/docker_swarm_manager'
import InstanceStatus from '#enums/instance_status'

export interface DeletionParams {
  databaseInstanceId: string
}

@inject()
export default class DatabaseDeletionOrchestrator {
  constructor(
    private logger: Logger,
    private databaseInstanceRepository: DatabaseInstanceRepository,
    private dockerCliService: DockerCliService
  ) {}

  async delete(params: DeletionParams): Promise<void> {
    try {
      const databaseInstance = await this.loadDatabaseInstance(params.databaseInstanceId)

      this.logger.info(
        `Deleting ${databaseInstance.databaseEngine} stack: ${databaseInstance.stackName}`
      )

      const cluster = this.validateAndGetCluster(databaseInstance, params.databaseInstanceId)

      if (cluster) {
        await this.removeDockerStack(cluster, databaseInstance.stackName)
      }

      await this.performSoftDelete(params.databaseInstanceId)

      this.logger.info(
        `Successfully deleted ${databaseInstance.databaseEngine}: ${databaseInstance.stackName}`
      )
    } catch (e) {
      this.logger.error(
        { e, databaseInstanceId: params.databaseInstanceId },
        'Something went wrong while deleting the database'
      )
      throw e
    }
  }

  /**
   * Load database instance with all required relations
   */
  private async loadDatabaseInstance(instanceId: string): Promise<DatabaseInstance> {
    const databaseInstance = await this.databaseInstanceRepository.findWithFullDetails(instanceId)

    if (!databaseInstance) {
      throw new Error(`Database instance ${instanceId} not found`)
    }

    return databaseInstance
  }

  /**
   * Validate deployment and return cluster if infrastructure cleanup is needed
   * Returns null if only soft delete should be performed
   */
  private validateAndGetCluster(
    databaseInstance: DatabaseInstance,
    instanceId: string
  ): DockerSwarmManager | null {
    // Check if deployment exists at all
    if (!databaseInstance.deployment) {
      this.logger.warn(
        `No deployment record found for database instance ${instanceId}. This might be a database that was never fully deployed. Proceeding with soft delete only.`
      )
      return null
    }

    // Check if dockerSwarmManagerId is null
    if (!databaseInstance.deployment.dockerSwarmManagerId) {
      this.logger.warn(
        `Deployment ${databaseInstance.deployment.id} has no dockerSwarmManagerId. This might be a failed deployment. Proceeding with soft delete only.`
      )
      return null
    }

    // Check if dockerSwarmManager relation loaded
    if (!databaseInstance.deployment.dockerSwarmManager) {
      this.logger.error(
        `Deployment ${databaseInstance.deployment.id} has dockerSwarmManagerId ${databaseInstance.deployment.dockerSwarmManagerId} but dockerSwarmManager relation is null. This is a preload issue.`
      )
      throw new Error(
        `Docker swarm manager relation not loaded for database instance ${instanceId}`
      )
    }

    return databaseInstance.deployment.dockerSwarmManager
  }

  /**
   * Remove Docker stack from the cluster
   */
  private async removeDockerStack(cluster: DockerSwarmManager, stackName: string): Promise<void> {
    try {
      await this.dockerCliService.run(cluster, (docker) => docker.stackRm(stackName))
      this.logger.info(`Successfully removed Docker stack: ${stackName}`)
    } catch (dockerError) {
      this.logger.warn(
        { error: dockerError, stackName },
        'Failed to remove Docker stack, but continuing with database cleanup'
      )
    }
  }

  /**
   * Perform soft delete operations on the database instance
   */
  private async performSoftDelete(instanceId: string): Promise<void> {
    await this.databaseInstanceRepository.update(instanceId, {
      status: InstanceStatus.DELETED,
    })
    await this.databaseInstanceRepository.delete(instanceId)
  }
}
