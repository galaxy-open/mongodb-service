import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

export default class HealthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Middleware logic goes here (before the next call)
     */
    if (ctx.request.header('x-monitoring-secret') !== env.get('MONITORING_SECRET')) {
      return ctx.response.unauthorized({ message: 'Unauthorized access' })
    }
    return next()
  }
}
