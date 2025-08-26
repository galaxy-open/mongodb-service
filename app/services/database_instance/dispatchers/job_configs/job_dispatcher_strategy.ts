import { inject } from '@adonisjs/core'
import DatabaseEngines from '#enums/database_engines'
import BaseJobDispatcher from '#services/database_instance/dispatchers/job_configs/base_job_dispatcher'
import MongoDBJobDispatcher from '#services/database_instance/dispatchers/job_configs/mongodb_job_dispatcher'

@inject()
export default class JobDispatcherStrategy {
  constructor(private readonly mongoDBJobDispatcher: MongoDBJobDispatcher) {}

  getJobDispatcher(databaseEngine: DatabaseEngines): BaseJobDispatcher {
    switch (databaseEngine) {
      case DatabaseEngines.MONGODB:
        return this.mongoDBJobDispatcher
      default:
        throw new Error(`Unsupported database engine: ${databaseEngine}`)
    }
  }
}
