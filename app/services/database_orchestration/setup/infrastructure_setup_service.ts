import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DatabaseConnectionBuilderService from '#services/database_connection_builder/database_connection_builder_service'
import DatabaseConnectionService from '#services/database_orchestration/helpers/database_connection_service'
import DockerSwarmManagerService from '#services/docker_swarm_manager_service'
import WorkerTypes from '#enums/worker_types'
import DeploymentTypes from '#enums/deployment_types'
import DockerSwarmWorker from '#models/docker_swarm_worker'
import {
  DeploymentParams,
  InfrastructureResult,
} from '#services/database_orchestration/types/deployment_types'
import DatabaseInstance from '#models/database_instance'

@inject()
export default class InfrastructureSetupService {
  constructor(
    private logger: Logger,
    private databaseConnectionBuilder: DatabaseConnectionBuilderService,
    private databaseConnectionService: DatabaseConnectionService,
    private dockerSwarmManagerService: DockerSwarmManagerService
  ) {}

  async setupInfrastructure(
    params: DeploymentParams,
    databaseInstance: DatabaseInstance
  ): Promise<InfrastructureResult> {
    switch (params.deploymentType) {
      case DeploymentTypes.STANDALONE:
        return this.setupStandaloneInfrastructure(params, databaseInstance)
      case DeploymentTypes.REPLICASET:
        return this.setupReplicaSetInfrastructure(params, databaseInstance)
      default:
        throw new Error(`Unsupported deployment type: ${params.deploymentType}`)
    }
  }

  private async setupStandaloneInfrastructure(
    params: DeploymentParams,
    databaseInstance: DatabaseInstance
  ): Promise<InfrastructureResult> {
    this.logger.info(
      `Setting up infrastructure for standalone ${databaseInstance.databaseEngine} deployment`
    )

    const workerNode = await this.dockerSwarmManagerService.getOptimalWorkerForDeployment(
      databaseInstance.regionCode,
      WorkerTypes.WORKER,
      params.serviceType,
      databaseInstance.ownerId
    )

    this.logger.info('Allocating and reserving port...')
    const port = await this.databaseConnectionService.allocateAndReservePort(
      databaseInstance.id,
      databaseInstance.regionCode,
      databaseInstance.tlsMode,
      workerNode.dockerSwarmManager
    )

    const hostnames = await this.generateHostnamesForWorkers(
      [workerNode],
      databaseInstance.stackName
    )

    const connectionUri = await this.databaseConnectionBuilder.generateHostnameUri(
      hostnames[0],
      port
    )

    this.logger.info('Standalone infrastructure setup completed')

    return {
      deploymentType: DeploymentTypes.STANDALONE,
      primaryWorker: workerNode,
      allWorkers: [workerNode],
      port,
      hostnames,
      connectionUri,
    }
  }

  private async setupReplicaSetInfrastructure(
    params: DeploymentParams,
    databaseInstance: DatabaseInstance
  ): Promise<InfrastructureResult> {
    this.logger.info('Setting up infrastructure for replica set MongoDB deployment')

    const availableWorkers = await this.dockerSwarmManagerService.getClusterWorkers(
      databaseInstance.regionCode,
      params.serviceType,
      databaseInstance.ownerId
    )

    const selectedWorkers = availableWorkers.slice(0, 3)

    if (selectedWorkers.length < 3) {
      this.logger.error(
        {
          availableCount: selectedWorkers.length,
          requiredCount: 3,
          region: databaseInstance.regionCode,
        },
        'Less than 3 workers available for replica set deployment'
      )
      throw new Error('Insufficient workers available for replica set deployment')
    }

    selectedWorkers.sort((a, b) => a.workerNumber - b.workerNumber)
    const primaryWorkerNode = selectedWorkers[0]

    const port = await this.databaseConnectionService.allocateAndReservePort(
      databaseInstance.id,
      databaseInstance.regionCode,
      databaseInstance.tlsMode,
      primaryWorkerNode.dockerSwarmManager
    )

    const hostnames = await this.generateHostnamesForWorkers(
      selectedWorkers,
      databaseInstance.stackName
    )

    const connectionUri = await this.databaseConnectionBuilder.generateReplicaSetUri(
      hostnames,
      port,
      databaseInstance.stackName
    )

    this.logger.info(
      {
        primaryWorker: primaryWorkerNode.name,
        totalWorkers: selectedWorkers.length,
        hostnames,
        port,
      },
      'Replica set infrastructure setup completed'
    )

    return {
      deploymentType: DeploymentTypes.REPLICASET,
      primaryWorker: primaryWorkerNode,
      allWorkers: selectedWorkers,
      port,
      hostnames,
      connectionUri,
    }
  }

  /**
   * Generate hostnames for all provided workers.
   */
  private async generateHostnamesForWorkers(
    workers: DockerSwarmWorker[],
    stackName: string
  ): Promise<string[]> {
    const hostnames: string[] = []
    for (const worker of workers) {
      const hostname = await this.databaseConnectionBuilder.generateDatabaseHostname(
        stackName,
        worker.workerNumber,
        worker.dockerSwarmManager.hostnamePrefix
      )
      hostnames.push(hostname)
    }
    return hostnames
  }
}
