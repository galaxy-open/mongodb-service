import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import DatabaseInstanceService from '#services/database_instance/database_instance_service'
import ApiDatabaseScopePolicy from '#policies/api/api_database_scope_policy'
import NotFoundException from '#exceptions/not_found_exception'
import MetricsService from '#services/metrics/metrics_service'
import { getDatabaseMetricsValidator } from '#validators/database_metrics'

@inject()
export default class DatabaseInstanceMetricsController {
  constructor(
    protected databaseInstanceService: DatabaseInstanceService,
    protected metricsService: MetricsService
  ) {}

  /**
   * @show
   * @operationId getDatabaseMetrics
   * @description Get all metrics for a specific database instance
   * @paramPath id - Database instance ID - @type(string) @required
   * @queryParam timeRange - Time range filter - @type(string) @required
   * @responseBody 200 - Database metrics
   * @responseBody 404 - Database instance not found
   * @responseBody 403 - Insufficient permissions
   */
  async show({ apiBouncer, owner, request }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('read')

    const {
      params: { id },
      timeRange,
    } = await request.validateUsing(getDatabaseMetricsValidator)

    const database = await this.databaseInstanceService.findByIdInContext({ id, ownerId: owner.id })

    if (!database) {
      throw new NotFoundException('Database not found')
    }

    const metrics = await this.metricsService.getAllDatabaseMetrics(database, timeRange)

    return metrics
  }
}
