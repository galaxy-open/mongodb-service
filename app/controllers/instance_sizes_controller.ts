import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import InstanceSizeService from '#services/instance_size_service'
import ApiDatabaseScopePolicy from '#policies/api/api_database_scope_policy'

@inject()
export default class InstanceSizesController {
  constructor(protected instanceSizeService: InstanceSizeService) {}

  /**
   * @index
   * @operationId getInstanceSizes
   * @description Returns array of all active instance sizes
   * @responseBody 200 - <InstanceSize[]>
   */
  async index({ apiBouncer }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('read')

    const instanceSizes = await this.instanceSizeService.getInstanceSizes()

    return instanceSizes
  }
}
