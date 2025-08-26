import JobHistory from '#models/job_history'
import JobStatus from '#enums/job_status'
import { DateTime } from 'luxon'

export default class JobHistoryRepository {
  /**
   * Retrieves a paginated list of JobHistory instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<JobHistory[]> {
    const result = await JobHistory.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves a JobHistory instance by its ID.
   */
  public async findById(id: string): Promise<JobHistory | null> {
    return JobHistory.find(id)
  }

  /**
   * Creates a new JobHistory instance.
   */
  public async create(data: Partial<JobHistory>): Promise<JobHistory> {
    return JobHistory.create(data)
  }

  /**
   * Creates or updates a JobHistory instance based on jobIdBullmq
   */
  public async upsertByJobId(data: Partial<JobHistory>): Promise<JobHistory> {
    if (!data.jobIdBullmq) {
      throw new Error('jobIdBullmq is required for upsert operation')
    }

    const existing = await this.findByBullMQId(data.jobIdBullmq)

    if (existing) {
      // Update existing record, increment attempts
      const updateData = {
        ...data,
        attemptsMade: (existing.attemptsMade || 0) + 1,
      }
      existing.merge(updateData)
      await existing.save()
      return existing
    } else {
      // Create new record
      return JobHistory.create(data)
    }
  }

  /**
   * Updates an existing JobHistory instance.
   */
  public async update(id: string, data: Partial<JobHistory>): Promise<JobHistory | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a JobHistory instance by its ID.
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  async findByBullMQId(jobIdBullmq: string): Promise<JobHistory | null> {
    return await JobHistory.findBy('jobIdBullmq', jobIdBullmq)
  }

  async findByInstance(instanceId: string, limit: number = 20): Promise<JobHistory[]> {
    return JobHistory.query()
      .where('databaseInstanceId', instanceId)
      .preload('createdByUser')
      .orderBy('createdAtQueue', 'desc')
      .limit(limit)
  }

  async findByOwner(ownerId: string, limit: number = 50): Promise<JobHistory[]> {
    return JobHistory.query()
      .where('ownerId', ownerId)
      .preload('databaseInstance')
      .preload('owner')
      .preload('createdByUser')
      .orderBy('createdAtQueue', 'desc')
      .limit(limit)
  }

  async findByUser(userId: string, limit: number = 30): Promise<JobHistory[]> {
    return JobHistory.query()
      .where('createdByUserId', userId)
      .preload('databaseInstance')
      .preload('owner')
      .preload('createdByUser')
      .orderBy('createdAtQueue', 'desc')
      .limit(limit)
  }

  async findByStatus(status: JobStatus, limit: number = 100): Promise<JobHistory[]> {
    return JobHistory.query()
      .where('status', status)
      .preload('databaseInstance')
      .preload('owner')
      .preload('createdByUser')
      .orderBy('createdAtQueue', 'desc')
      .limit(limit)
  }

  async findActiveJobs(): Promise<JobHistory[]> {
    return JobHistory.query()
      .whereIn('status', ['queued', 'active', 'delayed'])
      .preload('databaseInstance')
      .preload('owner')
      .preload('createdByUser')
      .orderBy('createdAtQueue', 'desc')
  }

  async findFailedJobs(limit: number = 100): Promise<JobHistory[]> {
    return JobHistory.query()
      .where('status', 'failed')
      .preload('databaseInstance')
      .preload('owner')
      .preload('createdByUser')
      .orderBy('createdAtQueue', 'desc')
      .limit(limit)
  }

  async findRecentJobs(limit: number = 50): Promise<JobHistory[]> {
    return JobHistory.query()
      .preload('databaseInstance')
      .preload('owner')
      .preload('createdByUser')
      .orderBy('createdAtQueue', 'desc')
      .limit(limit)
  }

  async findLongRunningJobs(thresholdMinutes: number = 30): Promise<JobHistory[]> {
    const threshold = DateTime.now().minus({ minutes: thresholdMinutes })

    return JobHistory.query()
      .where('status', 'active')
      .where('processingStartedAt', '<', threshold.toSQL())
      .preload('databaseInstance')
      .preload('owner')
      .preload('createdByUser')
      .orderBy('processingStartedAt', 'asc')
  }

  async countJobsByStatusSince(status: JobStatus, since: DateTime): Promise<number> {
    const result = await JobHistory.query()
      .where('status', status)
      .where('createdAtQueue', '>=', since.toJSDate())
      .count('* as total')

    return Number(result[0].$extras.total)
  }

  async getCompletedJobsSince(since: DateTime): Promise<JobHistory[]> {
    return JobHistory.query()
      .where('status', JobStatus.COMPLETED)
      .where('createdAtQueue', '>=', since.toJSDate())
      .whereNotNull('processingStartedAt')
      .whereNotNull('processingFinishedAt')
  }
}
