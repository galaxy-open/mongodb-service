import DeploymentTypes from '#enums/deployment_types'
import ExporterTypes from '#enums/exporter_types'
import ServiceTypes from '#enums/service_types'
import BaseDatabaseJob, { BaseDatabasePayload } from '#jobs/base_database_job'
import DatabaseOrchestrator from '#services/database_orchestration/database_orchestrator'
import JobHistoryService from '#services/job_history_service'
import { inject } from '@adonisjs/core'

type CreateMongoDBPayload = BaseDatabasePayload & {
  deploymentType: DeploymentTypes
}

@inject()
export default class CreateMongoDB extends BaseDatabaseJob<CreateMongoDBPayload> {
  constructor(
    protected databaseOrchestrator: DatabaseOrchestrator,
    protected jobHistoryService: JobHistoryService
  ) {
    super(jobHistoryService)
  }

  static get $$filepath() {
    return import.meta.url
  }

  async executeJobLogic(payload: CreateMongoDBPayload): Promise<void> {
    const exporterType = this.getExporterType(payload.deploymentType)

    return this.databaseOrchestrator.createMongoDB({
      databaseInstanceId: payload.databaseInstanceId,
      exporterType,
      serviceType: ServiceTypes.MONGODB,
      deploymentType: payload.deploymentType,
    })
  }

  private getExporterType(deploymentType: DeploymentTypes) {
    switch (deploymentType) {
      case DeploymentTypes.STANDALONE:
        return ExporterTypes.STANDALONE
      default:
        return ExporterTypes.REPLICASET
    }
  }
}
