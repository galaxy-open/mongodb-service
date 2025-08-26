import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import DatabaseVersionService from '#services/database_version_service'
import { databaseVersionIndexValidator } from '#validators/database_version_validator'
import ApiDatabaseScopePolicy from '#policies/api/api_database_scope_policy'

@inject()
export default class DatabaseVersionsController {
  constructor(protected databaseVersionService: DatabaseVersionService) {}

  /**
   * @index
   * @operationId getDatabaseVersions
   * @description Returns array of database versions with optional filters
   * @paramQuery visible - Filter by visibility status - @type(boolean)
   * @paramQuery database_engine - Filter by database engine - @enum(mongodb)
   * @responseBody 200 - <DatabaseVersion[]>
   */
  async index({ apiBouncer, request }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('read')

    const filters = await request.validateUsing(databaseVersionIndexValidator)

    const versions = await this.databaseVersionService.getVersions({
      visible: filters.visible,
      databaseEngine: filters.database_engine,
    })

    return versions
  }
}
