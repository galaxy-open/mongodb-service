import { inject } from '@adonisjs/core'
import DatabaseEngines from '#enums/database_engines'
import MongodbMetricsConfig from '#services/metrics/configs/mongodb_metrics_config'
import { DatabaseMetricsConfig } from '#services/metrics/configs/database_metrics_config'

@inject()
export default class DatabaseMetricsConfigRegistry {
  constructor(private mongodbConfig: MongodbMetricsConfig) {}

  /**
   * Get the appropriate metrics config for a database engine
   */
  getConfig(databaseEngine: DatabaseEngines): DatabaseMetricsConfig {
    switch (databaseEngine) {
      case DatabaseEngines.MONGODB:
        return this.mongodbConfig

      default:
        throw new Error(`Unsupported database engine: ${databaseEngine}`)
    }
  }
}
