import { inject } from '@adonisjs/core'
import DatabaseInstance from '#models/database_instance'
import JobDispatcherStrategy from '#services/database_instance/dispatchers/job_configs/job_dispatcher_strategy'

@inject()
export default class DatabaseJobDispatcher {
  constructor(private jobDispatcherStrategy: JobDispatcherStrategy) {}

  /**
   * Dispatches creation job for a database instance
   */
  async dispatchCreate(databaseInstance: DatabaseInstance, createdByUserId: string): Promise<void> {
    const dispatcher = this.jobDispatcherStrategy.getJobDispatcher(databaseInstance.databaseEngine)
    await dispatcher.dispatchCreate(databaseInstance, createdByUserId)
  }

  /**
   * Dispatches update job for a database instance
   */
  async dispatchUpdate(databaseInstance: DatabaseInstance): Promise<void> {
    const dispatcher = this.jobDispatcherStrategy.getJobDispatcher(databaseInstance.databaseEngine)
    await dispatcher.dispatchUpdate(databaseInstance)
  }

  /**
   * Dispatches delete job for a database instance
   */
  async dispatchDelete(databaseInstance: DatabaseInstance): Promise<void> {
    const dispatcher = this.jobDispatcherStrategy.getJobDispatcher(databaseInstance.databaseEngine)
    await dispatcher.dispatchDelete(databaseInstance)
  }
}
