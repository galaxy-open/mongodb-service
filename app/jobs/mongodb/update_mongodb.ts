import BaseDatabaseJob, { BaseDatabasePayload } from '#jobs/base_database_job'
import JobHistoryService from '#services/job_history_service'
import { inject } from '@adonisjs/core/container'

type UpdateMongoDBPayload = BaseDatabasePayload & {
  // Add other update-specific fields as needed
}

@inject()
export default class UpdateMongoDB extends BaseDatabaseJob<UpdateMongoDBPayload> {
  constructor(protected jobHistoryService: JobHistoryService) {
    super(jobHistoryService)
  }
  static get $$filepath() {
    return import.meta.url
  }

  async executeJobLogic(payload: UpdateMongoDBPayload): Promise<void> {
    // TODO: Call DockerService.updateMongoDBContainer(payload)
    // This is where the Docker update logic will go

    this.logger.info({ payload }, 'UpdateMongoDB job handled (update logic pending)')
  }
}
