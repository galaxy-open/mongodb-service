import DatabaseVersionRepository from '#repositories/database_version_repository'
import DatabaseEngines from '#enums/database_engines'
import { inject } from '@adonisjs/core'

@inject()
export default class DatabaseVersionService {
  constructor(private databaseVersionRepository: DatabaseVersionRepository) {}

  /**
   * Get database versions with optional filters
   */
  public async getVersions(
    filters: {
      visible?: boolean
      databaseEngine?: DatabaseEngines
    } = {}
  ) {
    return this.databaseVersionRepository.findAll(filters)
  }
}
