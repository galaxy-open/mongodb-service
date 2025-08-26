import DatabaseEngines from '#enums/database_engines'
import DatabaseInstanceNames from '#enums/database_instance_names'
import DeploymentTypes from '#enums/deployment_types'
import InstanceSize from '#models/instance_size'

export default class InstanceSizeRepository {
  /**
   * Find an active instance size by name (business key)
   */
  async findActiveByNameOrFail(name: DatabaseInstanceNames): Promise<InstanceSize> {
    const instanceSize = await InstanceSize.query()
      .where('name', name)
      .where('is_active', true)
      .first()
    if (!instanceSize) {
      throw new Error(`Instance size with name ${name} not found`)
    }
    return instanceSize
  }

  /**
   * Get all active instance sizes
   */
  async findAllActive(): Promise<InstanceSize[]> {
    return InstanceSize.query().where('is_active', true).whereNull('deleted_at')
  }

  /**
   * Find instance size by name (business key) - active or inactive
   */
  async findByName(name: DatabaseInstanceNames): Promise<InstanceSize> {
    const instanceSize = await InstanceSize.findBy('name', name)

    if (!instanceSize) {
      throw new Error(`Instance size with name ${name} not found`)
    }

    return instanceSize
  }

  /**
   * Find instance size by name - returns null if not found
   */
  async findByNameOptional(name: DatabaseInstanceNames): Promise<InstanceSize | null> {
    return InstanceSize.findBy('name', name)
  }

  /**
   * Find instance size by name (primary key)
   */
  async findById(name: DatabaseInstanceNames): Promise<InstanceSize | null> {
    return InstanceSize.find(name)
  }

  /**
   * Find instance size by name or fail
   */
  async findByIdOrFail(name: DatabaseInstanceNames): Promise<InstanceSize> {
    return InstanceSize.findOrFail(name)
  }

  async findByNameAndDatabaseEngineAndDeploymentType(
    name: DatabaseInstanceNames,
    databaseEngine: DatabaseEngines,
    deploymentType: DeploymentTypes
  ): Promise<InstanceSize> {
    const instanceSize = await InstanceSize.query()
      .where('name', name)
      .where('database_engine', databaseEngine)
      .where('deployment_type', deploymentType)
      .first()

    if (!instanceSize) {
      throw new Error(`Instance size with name ${name} not found`)
    }
    return instanceSize
  }
}
