import { inject } from '@adonisjs/core'
import InstanceSizeRepository from '#repositories/instance_size_repository'
import InstanceSize from '#models/instance_size'
import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'
import DatabaseInstanceNames from '#enums/database_instance_names'

@inject()
export default class InstanceSizeService {
  constructor(protected instanceSizeRepository: InstanceSizeRepository) {}

  /**
   * Get all active instance sizes
   */
  async getInstanceSizes(): Promise<InstanceSize[]> {
    return this.instanceSizeRepository.findAllActive()
  }

  /**
   * Find instance size by name, database engine and deployment type
   */
  async findByNameAndDatabaseEngineAndDeploymentType(
    name: DatabaseInstanceNames,
    databaseEngine: DatabaseEngines,
    deploymentType: DeploymentTypes
  ): Promise<InstanceSize> {
    return this.instanceSizeRepository.findByNameAndDatabaseEngineAndDeploymentType(
      name,
      databaseEngine,
      deploymentType
    )
  }
}
