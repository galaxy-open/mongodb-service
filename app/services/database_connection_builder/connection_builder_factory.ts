import { inject } from '@adonisjs/core'
import DatabaseEngines from '#enums/database_engines'
import { ConnectionBuilderStrategy } from '#interfaces/database_connection_builder'
import MongoDBConnectionBuilderStrategy from './strategies/mongodb_connection_builder_strategy.js'

/**
 * Factory for creating database-specific connection builder strategies
 */
@inject()
export default class ConnectionBuilderFactory {
  constructor(private mongoDBStrategy: MongoDBConnectionBuilderStrategy) {}

  /**
   * Get the appropriate connection builder strategy for the given database engine
   */
  getStrategy(databaseEngine: DatabaseEngines): ConnectionBuilderStrategy {
    switch (databaseEngine) {
      case DatabaseEngines.MONGODB:
        return this.mongoDBStrategy
      default:
        throw new Error(`Unsupported database engine: ${databaseEngine}`)
    }
  }
}
