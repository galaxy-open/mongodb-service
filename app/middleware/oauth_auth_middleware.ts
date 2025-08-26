import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'
import OAuthJitMiddleware from '#middleware/oauth_jit_middleware'
import AuthMiddleware from '#middleware/auth_middleware'

/**
 * OAuth Auth Middleware - Composed middleware that chains:
 * 1. OAuth JIT provisioning (id_token_hint)
 * 2. Session authentication (with redirect to login)
 */
@inject()
export default class OAuthAuthMiddleware {
  constructor(
    private oauthJit: OAuthJitMiddleware,
    private auth: AuthMiddleware
  ) {}

  async handle(ctx: HttpContext, next: NextFn) {
    // Chain: JIT provisioning -> session auth
    return this.oauthJit.handle(ctx, () => this.auth.handle(ctx, next))
  }
}
