import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import { DateTime } from 'luxon'
import DatabaseInstanceRepository from '#repositories/database_instance_repository'
import SecuritySetup from '#services/database_orchestration/setup/security_setup'
import DatabaseDnsService from '#services/database_dns/database_dns_service'
import DatabaseInitializationService from '#services/database_initialization/database_initialization_service'
import DatabasePersistenceService from '#services/database_persistence_service'
import CodeGeneratorService from '#services/code_generator_service'
import DockerSwarmWorkerService from '#services/docker_swarm_worker_service'
import DockerComposeGeneratorService from '#services/docker_compose/docker_compose_generator_service'
import DockerCliService from '#services/docker_cli/docker_cli_service'
import InfrastructureSetupService from '#services/database_orchestration/setup/infrastructure_setup_service'
import ReplicaKeyService from '#services/database_orchestration/helpers/replica_key_service'
import DeploymentCleanupService from '#services/database_orchestration/helpers/deployment_cleanup_service'
import drive from '@adonisjs/drive/services/main'
import DockerSwarmManager from '#models/docker_swarm_manager'
import {
  DeploymentParams,
  InfrastructureResult,
  PasswordsResult,
  DockerDeploymentResult,
  DockerParams,
  MetadataParams,
} from '#services/database_orchestration/types/deployment_types'
import DeploymentTypes from '#enums/deployment_types'

@inject()
export default class MongoDBDeploymentOrchestrator {
  constructor(
    private logger: Logger,
    private databaseInstanceRepository: DatabaseInstanceRepository,
    private securitySetup: SecuritySetup,
    private databaseDnsService: DatabaseDnsService,
    private databaseInitializationService: DatabaseInitializationService,
    private databasePersistenceService: DatabasePersistenceService,
    private codeGeneratorService: CodeGeneratorService,
    private dockerSwarmWorkerService: DockerSwarmWorkerService,
    private dockerComposeGeneratorService: DockerComposeGeneratorService,
    private dockerCliService: DockerCliService,
    private infrastructureSetupService: InfrastructureSetupService,
    private replicaKeyService: ReplicaKeyService,
    private deploymentCleanupService: DeploymentCleanupService
  ) {}

  async deploy(params: DeploymentParams): Promise<void> {
    const startTime = DateTime.now()

    try {
      this.logger.info(`Creating MongoDB ${params.deploymentType}...`)

      const databaseInstance = await this.databaseInstanceRepository.findByIdWithsize(
        params.databaseInstanceId
      )
      this.logger.info('Database Instance with Instance Size found')

      const infrastructure = await this.infrastructureSetupService.setupInfrastructure(
        params,
        databaseInstance
      )
      this.logger.info('Infrastructure setup successfully')

      const security = await this.securitySetup.setupSecurity(
        databaseInstance,
        infrastructure.primaryWorker.dockerSwarmManager
      )
      this.logger.info('Security setup successfully')

      const passwords = await this.generatePasswords()
      this.logger.info('Passwords generated successfully')

      const dockerDeployment = await this.deployStack({
        databaseInstance,
        infrastructure,
        passwords,
        security,
        exporterType: params.exporterType,
      })
      this.logger.info('Docker deployment successful')

      await this.databaseDnsService.createDatabaseDnsRecords({
        stackName: databaseInstance.stackName,
        regionCode: databaseInstance.regionCode,
        databaseEngine: databaseInstance.databaseEngine,
        serviceType: params.serviceType,
        ownerId: databaseInstance.ownerId,
        workerNodes: infrastructure.allWorkers,
      })

      this.logger.info(`DNS records created for ${params.deploymentType} deployment`)
      this.logger.info('DNS records created successfully')

      await this.databaseInitializationService.initialize({
        cluster: infrastructure.primaryWorker.dockerSwarmManager,
        stackName: databaseInstance.stackName,
        hostnames: infrastructure.hostnames,
        port: infrastructure.port,
        connectionUri: infrastructure.connectionUri,
        adminPassword: passwords.adminPassword,
        monitorPassword: passwords.monitorPassword,
        backupPassword: passwords.backupPassword,
        databaseInstanceId: databaseInstance.id,
        deploymentType: databaseInstance.deploymentType,
        replicaSetName: databaseInstance.stackName,
        databaseEngine: databaseInstance.databaseEngine,
        tlsMode: databaseInstance.tlsMode,
      })
      this.logger.info('Database initialized successfully')

      const endTime = DateTime.now()
      const duration = endTime.diff(startTime)

      await this.persistMetadata({
        databaseInstanceId: params.databaseInstanceId,
        infrastructure,
        passwords,
        dockerDeployment,
        regionCode: databaseInstance.regionCode,
        tlsMode: databaseInstance.tlsMode,
        clusterId: infrastructure.primaryWorker.dockerSwarmManager.id,
        deploymentStartedAt: startTime,
        deploymentDurationMs: duration.milliseconds,
        databaseEngine: databaseInstance.databaseEngine,
        deploymentType: databaseInstance.deploymentType,
      })
      this.logger.info('Persisted database metadata successfully')

      await this.updateWorkerCounts(infrastructure)
      this.logger.info('Worker current instances count updated')

      await this.cleanup()

      this.logger.info(
        {
          databaseInstanceId: params.databaseInstanceId,
          duration: duration.toFormat('m:ss'),
        },
        `MongoDB ${params.deploymentType} created successfully`
      )
    } catch (e) {
      const endTime = DateTime.now()
      const duration = endTime.diff(startTime)

      this.logger.error(
        {
          e,
          duration: duration.toFormat('m:ss'),
        },
        `Something went wrong while creating the MongoDB ${params.deploymentType.toString().toLowerCase()} database`
      )

      await this.deploymentCleanupService.attemptCleanupByInstanceId(params.databaseInstanceId, e)

      throw e
    }
  }

  private async generatePasswords(): Promise<PasswordsResult> {
    this.logger.debug('Generating passwords for MongoDB deployment')
    const adminPassword = this.codeGeneratorService.generatePassword()
    const monitorPassword = this.codeGeneratorService.generatePassword()
    const backupPassword = this.codeGeneratorService.generatePassword()
    const replicaKey = this.codeGeneratorService.generateMongoReplicaKey()

    return {
      adminPassword,
      monitorPassword,
      backupPassword,
      replicaKey,
    }
  }

  private async deployStack(params: DockerParams): Promise<DockerDeploymentResult> {
    const cluster = params.infrastructure.primaryWorker.dockerSwarmManager
    const instanceSize = params.databaseInstance.size
    const isReplicaSet = params.infrastructure.deploymentType === DeploymentTypes.REPLICASET

    await this.replicaKeyService.setupReplicaKeyIfNeeded({ ...params, isReplicaSet })

    const dbDockerComposeResult = await this.dockerComposeGeneratorService.generateDatabase({
      databaseType: params.databaseInstance.databaseEngine,
      deploymentType: params.databaseInstance.deploymentType,
      adminPassword: params.passwords.adminPassword,
      databaseVersion: params.databaseInstance.version.version,
      port: params.infrastructure.port,
      regionCode: params.databaseInstance.region.code,
      databaseWorkerNodes: params.infrastructure.allWorkers,
      cpuResources: instanceSize.cpuResources,
      memoryGb: instanceSize.memoryGbString,
      diskGb: instanceSize.diskGbString,
      instanceSize: instanceSize.name,
      tlsMode: params.databaseInstance.tlsMode,
      tlsSecretName: params.security.tlsSecretName || '',
      caSecretName: params.security.caSecretName || '',
      certLabel: params.security.certLabel || '',
      stackName: params.databaseInstance.stackName,
      isReplicaSet,
    })
    this.logger.info('Database Docker Compose generated successfully')

    await this.deployDockerStack(
      cluster,
      dbDockerComposeResult.filePath,
      params.databaseInstance.stackName,
      'Database Docker stack'
    )

    const exporterDockerComposeResult = await this.dockerComposeGeneratorService.generateExporter({
      stackName: params.databaseInstance.stackName,
      databaseType: params.databaseInstance.databaseEngine,
      deploymentType: params.databaseInstance.deploymentType,
      exporterType: params.exporterType,
      monitorPassword: params.passwords.monitorPassword,
      port: params.infrastructure.port,
      region: params.databaseInstance.region.code,
      databaseWorkerNode: params.infrastructure.primaryWorker, // Exporter connects to primary
      ownerId: params.databaseInstance.ownerId,
      hostnameUri: params.infrastructure.connectionUri, // Use connectionUri from infrastructure
      tlsMode: params.databaseInstance.tlsMode,
    })
    this.logger.info('Exporter Docker Compose generated successfully')

    await this.deployDockerStack(
      cluster,
      exporterDockerComposeResult.filePath,
      params.databaseInstance.stackName,
      'Exporter stack'
    )

    return {
      dockerComposeContent: dbDockerComposeResult.content,
      exporterComposeContent: exporterDockerComposeResult.content,
    }
  }

  private async persistMetadata(params: MetadataParams): Promise<void> {
    const workersIds = params.infrastructure.allWorkers.map((worker) => worker.id)

    await this.databasePersistenceService.persistDatabaseMetadata({
      databaseInstanceId: params.databaseInstanceId,
      port: params.infrastructure.port,
      hostnameUri: params.infrastructure.connectionUri,
      adminPassword: params.passwords.adminPassword,
      monitorPassword: params.passwords.monitorPassword,
      backupPassword: params.passwords.backupPassword,
      dockerComposeContent: params.dockerDeployment.dockerComposeContent,
      exporterComposeContent: params.dockerDeployment.exporterComposeContent,
      regionCode: params.regionCode,
      tlsMode: params.tlsMode,
      clusterId: params.clusterId,
      workersIds,
      replicaKey: params.passwords.replicaKey,
      deploymentStartedAt: params.deploymentStartedAt,
      deploymentDurationMs: params.deploymentDurationMs,
      databaseEngine: params.databaseEngine,
      deploymentType: params.deploymentType,
    })
  }

  private async updateWorkerCounts(infrastructure: InfrastructureResult): Promise<void> {
    for (const worker of infrastructure.allWorkers) {
      await this.dockerSwarmWorkerService.incrementWorkerCurrentInstancesCount(worker.id)
    }
  }

  private async cleanup(): Promise<void> {
    this.logger.info('Cleaning up tmp folder')
    const disk = drive.use('fs')
    await disk.deleteAll()
    this.logger.info('Tmp folder cleaned up')
  }

  /**
   * Deploy Docker stack with logging.
   */
  private async deployDockerStack(
    cluster: DockerSwarmManager,
    filePath: string,
    stackName: string,
    description: string
  ): Promise<void> {
    await this.dockerCliService.run(cluster, (docker) => docker.stackDeploy(filePath, stackName))
    this.logger.info(`${description} deployed successfully`)
  }
}
