import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'
import BaseDatabaseConfig from '#services/docker_compose/database_configs/base_database_config'
import MongoDBStandaloneConfig from '#services/docker_compose/database_configs/mongodb_standalone_config'
import MongoDBReplicaSetConfig from '#services/docker_compose/database_configs/mongodb_replicaset_config'
import { inject } from '@adonisjs/core'

@inject()
export default class DatabaseConfigStrategy {
  constructor(
    private readonly mongoDBStandaloneConfig: MongoDBStandaloneConfig,
    private readonly mongoDBReplicaSetConfig: MongoDBReplicaSetConfig
  ) {}

  getDbConfig(
    databaseEngine: DatabaseEngines,
    deploymentType: DeploymentTypes
  ): BaseDatabaseConfig {
    switch (databaseEngine) {
      case DatabaseEngines.MONGODB:
        return this.getMongoDBConfig(deploymentType)
      default:
        throw new Error(`Unsupported database engine: ${databaseEngine}`)
    }
  }

  private getMongoDBConfig(deploymentType: DeploymentTypes): BaseDatabaseConfig {
    switch (deploymentType) {
      case DeploymentTypes.REPLICASET:
        return this.mongoDBReplicaSetConfig
      case DeploymentTypes.STANDALONE:
        return this.mongoDBStandaloneConfig
      default:
        throw new Error(`Unsupported MongoDB deployment type: ${deploymentType}`)
    }
  }
}
