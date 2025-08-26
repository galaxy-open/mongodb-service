import DatabaseInstance from '#models/database_instance'

export default abstract class BaseJobDispatcher {
  /**
   * Dispatches creation job for a database instance
   */
  abstract dispatchCreate(
    databaseInstance: DatabaseInstance,
    createdByUserId: string
  ): Promise<void>

  /**
   * Dispatches update job for a database instance
   */
  abstract dispatchUpdate(databaseInstance: DatabaseInstance): Promise<void>

  /**
   * Dispatches delete job for a database instance
   */
  abstract dispatchDelete(databaseInstance: DatabaseInstance): Promise<void>
}
