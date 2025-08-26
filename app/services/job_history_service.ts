import { inject } from '@adonisjs/core'
import JobHistoryRepository from '#repositories/job_history_repository'
import JobHistory from '#models/job_history'
import JobStatus from '#enums/job_status'
import { DateTime } from 'luxon'

@inject()
export default class JobHistoryService {
  constructor(private jobHistoryRepository: JobHistoryRepository) {}

  async recordJobStart(data: {
    jobIdBullmq: string
    queueName: string
    jobName: string
    databaseInstanceId?: string
    ownerId: string
    createdByUserId: string
    inputData?: Record<string, any>
  }): Promise<JobHistory> {
    return await this.jobHistoryRepository.upsertByJobId({
      ...data,
      status: JobStatus.QUEUED,
      createdAtQueue: DateTime.now(),
      attemptsMade: 0,
    })
  }

  async updateJobStatus(
    jobIdBullmq: string,
    status: JobStatus,
    additionalData?: {
      resultData?: Record<string, any>
      errorMessage?: string
      errorStacktrace?: string
      attemptsMade?: number
    }
  ): Promise<JobHistory | null> {
    const jobHistory = await this.jobHistoryRepository.findByBullMQId(jobIdBullmq)
    if (!jobHistory) return null

    const updateData: Partial<JobHistory> = {
      status,
      ...additionalData,
    }

    if (status === JobStatus.ACTIVE && !jobHistory.processingStartedAt) {
      updateData.processingStartedAt = DateTime.now()
    }

    if ([JobStatus.COMPLETED, JobStatus.FAILED].includes(status)) {
      updateData.processingFinishedAt = DateTime.now()
    }

    return await this.jobHistoryRepository.update(jobHistory.id, updateData)
  }

  async getJobsByInstance(databaseInstanceId: string, limit: number = 50): Promise<JobHistory[]> {
    return await this.jobHistoryRepository.findByInstance(databaseInstanceId, limit)
  }

  async getJobsByOwner(ownerId: string, limit: number = 50): Promise<JobHistory[]> {
    return await this.jobHistoryRepository.findByOwner(ownerId, limit)
  }

  async getJobsByUser(userId: string, limit: number = 30): Promise<JobHistory[]> {
    return await this.jobHistoryRepository.findByUser(userId, limit)
  }

  async getActiveJobs(): Promise<JobHistory[]> {
    return await this.jobHistoryRepository.findActiveJobs()
  }

  async getFailedJobs(limit: number = 100): Promise<JobHistory[]> {
    return await this.jobHistoryRepository.findFailedJobs(limit)
  }

  async getRecentJobs(limit: number = 50): Promise<JobHistory[]> {
    return await this.jobHistoryRepository.findRecentJobs(limit)
  }

  async getLongRunningJobs(thresholdMinutes: number = 30): Promise<JobHistory[]> {
    return await this.jobHistoryRepository.findLongRunningJobs(thresholdMinutes)
  }

  async isJobComplete(jobIdBullmq: string): Promise<boolean> {
    const job = await this.jobHistoryRepository.findByBullMQId(jobIdBullmq)
    return job?.status === JobStatus.COMPLETED
  }

  async isJobFailed(jobIdBullmq: string): Promise<boolean> {
    const job = await this.jobHistoryRepository.findByBullMQId(jobIdBullmq)
    return job?.status === JobStatus.FAILED
  }

  async getJobDuration(jobIdBullmq: string): Promise<number | null> {
    const job = await this.jobHistoryRepository.findByBullMQId(jobIdBullmq)

    if (!job?.processingStartedAt || !job?.processingFinishedAt) {
      return null
    }

    return job.processingFinishedAt.diff(job.processingStartedAt, 'seconds').seconds
  }

  // Worker monitoring methods
  async getActiveJobsCount(): Promise<number> {
    const activeJobs = await this.getActiveJobs()
    return activeJobs.length
  }

  async getFailedJobsCount(hoursAgo: number = 24): Promise<number> {
    const threshold = DateTime.now().minus({ hours: hoursAgo })

    return await this.jobHistoryRepository.countJobsByStatusSince(JobStatus.FAILED, threshold)
  }

  async getCompletedJobsCount(hoursAgo: number = 24): Promise<number> {
    const threshold = DateTime.now().minus({ hours: hoursAgo })

    return await this.jobHistoryRepository.countJobsByStatusSince(JobStatus.COMPLETED, threshold)
  }

  async getAverageProcessingTime(hoursAgo: number = 24): Promise<number | null> {
    const threshold = DateTime.now().minus({ hours: hoursAgo })

    const completedJobs = await this.jobHistoryRepository.getCompletedJobsSince(threshold)

    if (completedJobs.length === 0) return null

    const totalDuration = completedJobs.reduce((sum: number, job: JobHistory) => {
      if (!job.processingStartedAt || !job.processingFinishedAt) return sum
      return sum + job.processingFinishedAt.diff(job.processingStartedAt, 'seconds').seconds
    }, 0)

    return totalDuration / completedJobs.length
  }

  async findLongRunningJobs(thresholdMinutes: number = 30): Promise<JobHistory[]> {
    return await this.getLongRunningJobs(thresholdMinutes)
  }
}
