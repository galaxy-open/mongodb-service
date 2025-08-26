import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import DatabaseInstanceService from '#services/database_instance/database_instance_service'
import {
  createDatabaseInstanceValidator,
  databaseInstanceIdValidator,
  updateDatabaseInstanceValidator,
} from '#validators/database_instances'
import ApiDatabaseScopePolicy from '#policies/api/api_database_scope_policy'
import NotFoundException from '#exceptions/not_found_exception'
import DatabaseInstanceStatsService from '#services/database_instance/helpers/database_instance_stats_service'

@inject()
export default class DatabaseInstancesController {
  constructor(
    protected databaseInstanceService: DatabaseInstanceService,
    protected databaseInstanceStatsService: DatabaseInstanceStatsService
  ) {}

  /**
   * @index
   * @operationId getDatabaseInstances
   * @description Returns array of database instances with optional Docker information and status counts
   * @responseBody 200 - <DatabaseInstance[]>
   * @responseHeader 200 - @use(paginated)
   */
  async index({ apiBouncer, owner }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('read')

    const databases = await this.databaseInstanceService.listInContext(owner.id)

    const statusCounts = await this.databaseInstanceStatsService.getStatusCounts(
      owner.id,
      databases
    )

    return {
      databases,
      meta: {
        total: databases.length,
        statusCounts,
      },
    }
  }

  /**
   * @store
   * @operationId createDatabaseInstance
   * @description Create a new database instance within token context
   * @requestBody <CreateDatabaseInstanceValidator>
   * @responseBody 201 - <DatabaseInstance>
   * @responseBody 400 - Validation failed
   * @responseBody 403 - Insufficient permissions
   */
  async store({ apiBouncer, owner, request, response }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('write')

    const payload = await request.validateUsing(createDatabaseInstanceValidator)

    const database = await this.databaseInstanceService.createInContext(payload, owner)

    return response.created(database)
  }

  /**
   * @show
   * @operationId getDatabaseInstance
   * @description Get a single database instance by ID with optional Docker information
   * @paramPath id - Database instance ID - @type(string) @required
   * @responseBody 200 - <DatabaseInstance>
   * @responseBody 404 - Database instance not found
   * @responseBody 403 - Insufficient permissions
   */
  async show({ apiBouncer, owner, request }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('read')

    const {
      params: { id },
    } = await request.validateUsing(databaseInstanceIdValidator)

    const database = await this.databaseInstanceService.findByIdInContext({ id, ownerId: owner.id })

    if (!database) {
      throw new NotFoundException('Database not found')
    }

    // Serialize database to clean JSON object
    return typeof database.toJSON === 'function' ? database.toJSON() : database
  }

  /**
   * @update
   * @operationId updateDatabaseInstance
   * @description Update a database instance within token context
   * @paramPath id - Database instance ID - @type(string) @required
   * @requestBody <UpdateDatabaseInstanceValidator>
   * @responseBody 204 - Database instance updated successfully
   * @responseBody 400 - Validation failed
   * @responseBody 404 - Database instance not found
   * @responseBody 403 - Insufficient permissions
   */
  async update({ apiBouncer, owner, request, response }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('write')

    const {
      params: { id },
      ...payload
    } = await request.validateUsing(updateDatabaseInstanceValidator)

    const database = await this.databaseInstanceService.updateInContext(
      { id, ownerId: owner.id },
      payload
    )

    if (!database) {
      throw new NotFoundException('Database not found')
    }

    return response.noContent()
  }

  /**
   * @destroy
   * @operationId deleteDatabaseInstance
   * @description Delete a database instance within token context
   * @paramPath id - Database instance ID - @type(string) @required
   * @responseBody 204 - Database instance deleted successfully
   * @responseBody 404 - Database instance not found
   * @responseBody 403 - Insufficient permissions (admin required)
   */
  async destroy({ apiBouncer, owner, request, response }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('write')

    const {
      params: { id },
    } = await request.validateUsing(databaseInstanceIdValidator)

    const deleted = await this.databaseInstanceService.deleteInContext({
      id,
      ownerId: owner.id,
    })

    if (!deleted) {
      throw new NotFoundException('Database not found')
    }

    return response.noContent()
  }

  /**
   * @stats
   * @operationId getDatabaseInstanceStats
   * @summary Get database instance statistics
   * @description Fast endpoint: Get only status counts without Docker calls
   * @responseBody 200 - {"total": 10, "running": 5, "stopped": 3, "failed": 2}
   * @responseBody 403 - Insufficient permissions
   */
  async stats({ apiBouncer, owner }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('read')

    return this.databaseInstanceStatsService.getQuickSummary(owner.id)
  }
}
