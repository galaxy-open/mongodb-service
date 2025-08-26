import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import DatabaseInstanceRepository from '#repositories/database_instance_repository'
import DatabaseConnectionRepository from '#repositories/database_connection_repository'
import DatabaseDeploymentRepository from '#repositories/database_deployment_repository'
import InstanceStatus from '#enums/instance_status'
import TLSModes from '#enums/tls_modes'
import RegionCodes from '#enums/region_codes'
import DatabaseEngines from '#enums/database_engines'
import DatabaseConnectionBuilderService from '#services/database_connection_builder/database_connection_builder_service'
import DeploymentTypes from '#enums/deployment_types'

export interface DatabasePersistenceData {
  databaseInstanceId: string
  port: number
  hostnameUri: string
  adminPassword: string
  monitorPassword: string
  backupPassword: string
  dockerComposeContent: string
  exporterComposeContent: string
  regionCode: RegionCodes
  tlsMode: TLSModes
  replicaKey?: string
  clusterId: string
  workersIds: string[]
  deploymentStartedAt: DateTime
  deploymentDurationMs: number
  databaseEngine: DatabaseEngines
  deploymentType: DeploymentTypes
}

@inject()
export default class DatabasePersistenceService {
  constructor(
    protected logger: Logger,
    protected databaseInstanceRepository: DatabaseInstanceRepository,
    protected databaseConnectionRepository: DatabaseConnectionRepository,
    protected databaseDeploymentRepository: DatabaseDeploymentRepository,
    protected databaseConnectionBuilder: DatabaseConnectionBuilderService
  ) {}

  async persistDatabaseMetadata(data: DatabasePersistenceData): Promise<void> {
    this.logger.info('Starting database metadata persistence')

    await db.transaction(async (trx) => {
      await this.databaseInstanceRepository.update(
        data.databaseInstanceId,
        { status: InstanceStatus.RUNNING },
        trx
      )

      const isReplica = data.deploymentType === DeploymentTypes.REPLICASET

      const adminUri = this.databaseConnectionBuilder.buildAdminConnection(data.databaseEngine, {
        hostnameUri: data.hostnameUri,
        password: data.adminPassword,
        isReplica,
        tlsMode: data.tlsMode,
      })

      const backupUri = this.databaseConnectionBuilder.buildBackupConnection(data.databaseEngine, {
        hostnameUri: data.hostnameUri,
        password: data.backupPassword,
        isReplica,
        tlsMode: data.tlsMode,
      })

      const monitorUri = this.databaseConnectionBuilder.buildMonitorConnection(
        data.databaseEngine,
        {
          hostnameUri: data.hostnameUri,
          password: data.monitorPassword,
          isReplica,
          tlsMode: data.tlsMode,
        }
      )
      await this.databaseConnectionRepository.upsert(
        data.databaseInstanceId,
        {
          regionCode: data.regionCode,
          port: data.port,
          hostnameUri: data.hostnameUri,
          adminUri,
          backupUri,
          monitorUri,
          tlsMode: data.tlsMode,
          adminPassword: data.adminPassword,
          backupPassword: data.backupPassword,
          monitorPassword: data.monitorPassword,
          replicaKey: data.replicaKey,
        },
        trx
      )

      await this.databaseDeploymentRepository.upsert(
        data.databaseInstanceId,
        {
          dockerComposeContent: data.dockerComposeContent,
          exporterComposeContent: data.exporterComposeContent,
          backupEnabled: true,
          dockerSwarmManagerId: data.clusterId,
          workerIds: data.workersIds,
          deploymentStartedAt: data.deploymentStartedAt,
          deploymentDurationMs: data.deploymentDurationMs,
        },
        trx
      )
    })

    this.logger.info('Database metadata persisted successfully')
  }
}
