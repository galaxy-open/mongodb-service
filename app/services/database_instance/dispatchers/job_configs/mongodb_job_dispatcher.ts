import { inject } from '@adonisjs/core'
import DatabaseInstance from '#models/database_instance'
import BaseJobDispatcher from '#services/database_instance/dispatchers/job_configs/base_job_dispatcher'
import queue from '@rlanz/bull-queue/services/main'
import CreateMongoDB from '#jobs/mongodb/create_mongodb'
import UpdateMongoDB from '#jobs/mongodb/update_mongodb'
import DeleteDatabase from '#jobs/delete_database'

@inject()
export default class MongoDBJobDispatcher extends BaseJobDispatcher {
  /**
   * Dispatches creation job for a MongoDB instance
   */
  async dispatchCreate(databaseInstance: DatabaseInstance, createdByUserId: string): Promise<void> {
    await queue.dispatch(CreateMongoDB, {
      databaseInstanceId: databaseInstance.id,
      ownerId: databaseInstance.ownerId,
      createdByUserId,
      deploymentType: databaseInstance.deploymentType,
    })
  }

  /**
   * Dispatches update job for a MongoDB instance
   */
  async dispatchUpdate(databaseInstance: DatabaseInstance): Promise<void> {
    await queue.dispatch(UpdateMongoDB, {
      ownerId: databaseInstance.ownerId,
      createdByUserId: databaseInstance.createdByUserId,
      databaseInstanceId: databaseInstance.id,
    })
  }

  /**
   * Dispatches delete job for a MongoDB instance
   */
  async dispatchDelete(databaseInstance: DatabaseInstance): Promise<void> {
    await queue.dispatch(DeleteDatabase, {
      databaseInstanceId: databaseInstance.id,
      ownerId: databaseInstance.ownerId,
      createdByUserId: databaseInstance.createdByUserId,
    })
  }
}
