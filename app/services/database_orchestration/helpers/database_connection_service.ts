import DatabaseConnectionRepository from '#repositories/database_connection_repository'
import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DatabaseConnection from '#models/database_connection'
@inject()
export default class DatabaseConnectionService {
  constructor(
    protected databaseConnectionRepository: DatabaseConnectionRepository,
    protected logger: Logger
  ) {}

  /**
   * Get connection information for a database instance
   */
  async getConnectionByDatabaseInstanceId(
    databaseInstanceId: string
  ): Promise<DatabaseConnection | null> {
    const connection =
      await this.databaseConnectionRepository.findByDatabaseInstanceId(databaseInstanceId)

    return connection
  }
}
