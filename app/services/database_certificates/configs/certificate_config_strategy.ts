import DatabaseEngines from '#enums/database_engines'
import { BaseCertificateConfig } from '#services/database_certificates/configs/base_certificate_config'
import MongoDBCertificateConfig from '#services/database_certificates/configs/mongodb_certificate_config'
import { inject } from '@adonisjs/core'

@inject()
export default class CertificateConfigStrategy {
  constructor(private readonly mongoDBConfig: MongoDBCertificateConfig) {}

  getDbConfig(databaseEngine: DatabaseEngines): BaseCertificateConfig {
    switch (databaseEngine) {
      case DatabaseEngines.MONGODB:
        return this.mongoDBConfig
      default:
        throw new Error(`Unsupported database engine: ${databaseEngine}`)
    }
  }
}
