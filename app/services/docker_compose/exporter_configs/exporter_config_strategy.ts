import { inject } from '@adonisjs/core'
import DatabaseEngines from '#enums/database_engines'
import BaseExporterConfig from '#services/docker_compose/exporter_configs/base_exporter_config'
import MongoDBExporterConfig from '#services/docker_compose/exporter_configs/mongodb_exporter_config'

@inject()
export default class ExporterConfigStrategy {
  constructor(private readonly mongoDBExporterConfig: MongoDBExporterConfig) {}

  getExporterConfig(databaseEngine: DatabaseEngines): BaseExporterConfig {
    switch (databaseEngine) {
      case DatabaseEngines.MONGODB:
        return this.mongoDBExporterConfig
      default:
        throw new Error(`Unsupported database engine for exporter: ${databaseEngine}`)
    }
  }
}
