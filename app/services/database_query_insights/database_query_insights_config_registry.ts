import { inject } from '@adonisjs/core'
import DatabaseEngines from '#enums/database_engines'
import MongodbQueryInsightsConfig from '#services/database_query_insights/configs/mongodb_query_insights_config'
import { DatabaseQueryInsightsConfig } from '#services/database_query_insights/configs/database_query_insights_config'

@inject()
export default class DatabaseQueryInsightsConfigRegistry {
  constructor(private mongodbConfig: MongodbQueryInsightsConfig) {}

  /**
   * Get the appropriate query insights config for a database engine
   */
  getConfig(databaseEngine: DatabaseEngines): DatabaseQueryInsightsConfig {
    switch (databaseEngine) {
      case DatabaseEngines.MONGODB:
        return this.mongodbConfig

      default:
        throw new Error(`Unsupported database engine: ${databaseEngine}`)
    }
  }
}
