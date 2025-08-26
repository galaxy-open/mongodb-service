import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import DatabaseInstanceService from '#services/database_instance/database_instance_service'
import ApiDatabaseScopePolicy from '#policies/api/api_database_scope_policy'
import NotFoundException from '#exceptions/not_found_exception'
import LogsService from '#services/logs/logs_service'
import { getDatabaseLogsValidator } from '#validators/database_logs'

@inject()
export default class DatabaseLogsController {
  constructor(
    protected databaseInstanceService: DatabaseInstanceService,
    protected logsService: LogsService
  ) {}

  /**
   * @show
   * @operationId getDatabaseLogs
   * @description Get logs for a specific database instance with optional cursor pagination
   * @paramPath id - Database instance ID - @type(string) @required
   * @queryParam limit - Number of logs to return - @type(number) @optional
   * @queryParam cursor - Cursor for pagination (timestamp) - @type(string) @optional
   * @queryParam minDate - Start date filter - @type(string) @optional
   * @queryParam maxDate - End date filter - @type(string) @optional
   * @queryParam stream - Log stream filter - @type(string) @optional
   * @responseBody 200 - Database logs
   * @responseBody 404 - Database instance not found
   * @responseBody 403 - Insufficient permissions
   */
  async show({ apiBouncer, owner, request }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('read')

    const {
      params: { id },
      limit,
      cursor,
      minDate,
      maxDate,
      stream,
    } = await request.validateUsing(getDatabaseLogsValidator)

    const database = await this.databaseInstanceService.findByIdInContext({
      id,
      ownerId: owner.id,
    })

    if (!database) {
      throw new NotFoundException('Database not found')
    }

    return this.logsService.queryDatabaseLogs(database.databaseEngine, {
      stackName: database.stackName,
      region: database.regionCode,
      limit,
      minDate,
      maxDate,
      stream,
      cursorTimestamp: cursor,
    })
  }
}
