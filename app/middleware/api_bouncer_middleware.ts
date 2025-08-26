import { policies } from '#policies/main'

import { Bouncer } from '@adonisjs/bouncer'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Init bouncer middleware is used to create a bouncer instance
 * during an HTTP request
 */
export default class ApiBouncerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Create a bouncer instance for the ongoing HTTP request.
     * We will pull the owner from the HTTP context.
     */
    ctx.apiBouncer = new Bouncer(() => ctx.owner || null, {}, policies)

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    apiBouncer: Bouncer<Exclude<HttpContext['owner'], undefined>, {}, typeof policies>
  }
}
