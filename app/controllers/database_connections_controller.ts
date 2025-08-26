import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import DatabaseConnectionService from '#services/database_orchestration/helpers/database_connection_service'
import DatabaseInstanceService from '#services/database_instance/database_instance_service'
import { databaseInstanceIdValidator } from '#validators/database_instances'
import ApiDatabaseScopePolicy from '#policies/api/api_database_scope_policy'
import NotFoundException from '#exceptions/not_found_exception'

@inject()
export default class DatabaseConnectionsController {
  constructor(
    protected databaseConnectionService: DatabaseConnectionService,
    protected databaseInstanceService: DatabaseInstanceService
  ) {}

  /**
   * @show
   * @operationId getDatabaseConnection
   * @summary Get database connection information
   * @description Get connection details for a specific database instance
   * @paramPath id - Database instance ID - @type(string) @required
   * @responseBody 200 - <DatabaseConnection>
   * @responseBody 404 - Database connection not found
   * @responseBody 403 - Insufficient permissions
   */
  async show({ apiBouncer, owner, request }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('read')

    const {
      params: { id },
    } = await request.validateUsing(databaseInstanceIdValidator)

    // Verify database belongs to owner
    const database = await this.databaseInstanceService.findByIdInContext({ id, ownerId: owner.id })

    if (!database) {
      throw new NotFoundException('Database not found')
    }

    // Get connection information
    const connection = await this.databaseConnectionService.getConnectionByDatabaseInstanceId(id)

    if (!connection) {
      throw new NotFoundException('Database connection not found')
    }

    return connection
  }
}
