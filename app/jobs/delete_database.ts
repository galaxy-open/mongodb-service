import BaseDatabaseJob, { BaseDatabasePayload } from '#jobs/base_database_job'
import DatabaseOrchestrator from '#services/database_orchestration/database_orchestrator'
import JobHistoryService from '#services/job_history_service'
import { inject } from '@adonisjs/core/container'

type DeleteDatabasePayload = BaseDatabasePayload

@inject()
export default class DeleteDatabase extends BaseDatabaseJob<DeleteDatabasePayload> {
  constructor(
    protected jobHistoryService: JobHistoryService,
    protected databaseOrchestrator: DatabaseOrchestrator
  ) {
    super(jobHistoryService)
  }

  static get $$filepath() {
    return import.meta.url
  }

  async executeJobLogic(payload: DeleteDatabasePayload): Promise<void> {
    return this.databaseOrchestrator.deleteDatabase({
      databaseInstanceId: payload.databaseInstanceId,
    })
  }
}
