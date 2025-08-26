import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import DatabaseInstanceService from '#services/database_instance/database_instance_service'
import ApiDatabaseScopePolicy from '#policies/api/api_database_scope_policy'
import NotFoundException from '#exceptions/not_found_exception'
import DatabaseQueryInsightsService from '#services/database_query_insights/database_query_insights_service'
import { getDatabaseQueryInsightsValidator } from '#validators/database_query_insights'

@inject()
export default class DatabaseQueryInsightsController {
  constructor(
    protected databaseInstanceService: DatabaseInstanceService,
    protected databaseQueryInsightsService: DatabaseQueryInsightsService
  ) {}

  /**
   * @show
   * @operationId getDatabaseQueryInsights
   * @description Get all query insights for a specific database instance
   * @paramPath id - Database instance ID - @type(string) @required
   * @queryParam timeRange - Time range filter - @type(string) @required
   * @responseBody 200 - Database query insights
   * @responseBody 404 - Database instance not found
   * @responseBody 403 - Insufficient permissions
   */
  async show({ apiBouncer, owner, request }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('read')

    const {
      params: { id },
      timeRange,
    } = await request.validateUsing(getDatabaseQueryInsightsValidator)

    const database = await this.databaseInstanceService.findByIdInContext({ id, ownerId: owner.id })

    if (!database) {
      throw new NotFoundException('Database not found')
    }

    const queryInsights = await this.databaseQueryInsightsService.getAllQueryInsights(
      database,
      timeRange
    )

    return queryInsights
  }
}
