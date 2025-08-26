import { ORCHESTRATION_QUEUE } from '#config/queue'
import JobStatus from '#enums/job_status'
import JobHistoryService from '#services/job_history_service'
import { inject } from '@adonisjs/core'
import { Job } from '@rlanz/bull-queue'

export type BaseDatabasePayload = {
  databaseInstanceId: string
  ownerId: string
  createdByUserId: string
}

@inject()
export default abstract class BaseDatabaseJob<
  T extends BaseDatabasePayload = BaseDatabasePayload,
> extends Job {
  constructor(protected jobHistoryService: JobHistoryService) {
    super()
  }

  /**
   * Abstract method that must be implemented by concrete job classes
   */
  abstract executeJobLogic(payload: T): Promise<void>

  /**
   * Template method that defines the overall structure of job handling
   */
  public async handle(payload: T) {
    await this.startHandler(payload)

    // Call the specific implementation
    await this.executeJobLogic(payload)

    await this.completedHandler(payload)
  }

  /**
   * Start the job and record the job start in the job history
   */
  private async startHandler(payload: T) {
    this.logger.info({ payload }, `${this.constructor.name} job started`)
    const job = this.getJob()
    await this.jobHistoryService.recordJobStart({
      jobIdBullmq: job.id!,
      queueName: ORCHESTRATION_QUEUE,
      jobName: job.name,
      databaseInstanceId: payload.databaseInstanceId,
      ownerId: payload.ownerId,
      createdByUserId: payload.createdByUserId,
      inputData: payload,
    })

    await this.jobHistoryService.updateJobStatus(job.id!, JobStatus.ACTIVE)
  }

  /**
   * Template method for completion handling
   */
  private async completedHandler(payload: T) {
    this.logger.info({ payload }, `${this.constructor.name} job completed`)

    const jobId = this.getId()
    await this.jobHistoryService.updateJobStatus(jobId!, JobStatus.COMPLETED, {
      resultData: { message: `${this.constructor.name} job completed` },
    })
  }

  /**
   * Template method for failure handling
   */
  public async rescue(_payload: T, error: Error) {
    this.logger.error({ error }, `${this.constructor.name} job failed`)

    const jobId = this.getId()
    await this.jobHistoryService.updateJobStatus(jobId!, JobStatus.FAILED, {
      errorMessage: error.message || this.getFailedReason(),
      errorStacktrace: error.stack || JSON.stringify(this.getJob().stacktrace),
      attemptsMade: this.getAttempts(),
    })
  }
}
