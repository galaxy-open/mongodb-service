import DatabaseEngines from '#enums/database_engines'
import DatabaseVersions from '#enums/database_versions'
import DatabaseVersion from '#models/database_version'

export default class DatabaseVersionRepository {
  /**
   * Find an active database version by version string (business key)
   */
  async findActiveByVersion(version: DatabaseVersions): Promise<DatabaseVersion | null> {
    return DatabaseVersion.query().where('version', version).where('is_active', true).first()
  }

  /**
   * Find database version by version string or fail
   */
  async findByVersionOrFail(version: DatabaseVersions): Promise<DatabaseVersion> {
    const dbVersion = await DatabaseVersion.findBy('version', version)
    if (!dbVersion) {
      throw new Error(`Database version ${version} not found`)
    }
    return dbVersion
  }

  /**
   * Get all active database versions for a specific engine
   */
  async findAllActiveByEngine(engine: DatabaseEngines): Promise<DatabaseVersion[]> {
    return DatabaseVersion.query()
      .where('database_engine', engine)
      .where('is_active', true)
      .orderBy('version', 'desc')
  }

  /**
   * Get all active and visible database versions for a specific engine (for UI listings)
   */
  async findAllVisibleByEngine(engine: DatabaseEngines): Promise<DatabaseVersion[]> {
    return DatabaseVersion.query()
      .where('database_engine', engine)
      .where('is_active', true)
      .where('is_visible', true)
      .orderBy('version', 'desc')
  }

  /**
   * Get all active database versions
   */
  async findAllActive(): Promise<DatabaseVersion[]> {
    return DatabaseVersion.query()
      .where('is_active', true)
      .orderBy('database_engine', 'asc')
      .orderBy('version', 'desc')
  }

  /**
   * Get all active and visible database versions (for UI listings)
   */
  async findAllVisible(): Promise<DatabaseVersion[]> {
    return DatabaseVersion.query()
      .where('is_active', true)
      .where('is_visible', true)
      .orderBy('database_engine', 'asc')
      .orderBy('version', 'desc')
  }

  /**
   * Find database version by version string (business key) - active or inactive
   */
  async findByVersion(version: DatabaseVersions): Promise<DatabaseVersion | null> {
    return DatabaseVersion.findBy('version', version)
  }

  /**
   * Find database version by version (primary key)
   */
  async findById(version: DatabaseVersions): Promise<DatabaseVersion | null> {
    return DatabaseVersion.find(version)
  }

  /**
   * Find database version by version or fail
   */
  async findByIdOrFail(version: DatabaseVersions): Promise<DatabaseVersion> {
    return DatabaseVersion.findOrFail(version)
  }

  /**
   * Find all database versions with optional filters
   */
  async findAll(
    filters: {
      visible?: boolean
      databaseEngine?: DatabaseEngines
    } = {}
  ): Promise<DatabaseVersion[]> {
    const query = DatabaseVersion.query().where('is_active', true)

    if (filters.visible !== undefined) {
      query.where('is_visible', filters.visible)
    }

    if (filters.databaseEngine) {
      query.where('database_engine', filters.databaseEngine)
    }

    return query.orderBy('database_engine', 'asc').orderBy('version', 'desc')
  }
}
