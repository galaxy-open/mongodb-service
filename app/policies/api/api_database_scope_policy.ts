import { allowGuest, BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OAuthScopes from '#enums/oauth_scopes'
import type { IhttpOwner } from '#interfaces/http_owner'

/**
 * Database Scope Policy
 * Single Responsibility: Only validates OAuth scopes
 * Ownership is handled automatically by token context in repositories
 */
export default class ApiDatabaseScopePolicy extends BasePolicy {
  /**
   * Check if user has database read scope
   */
  @allowGuest()
  read(owner: IhttpOwner | null): AuthorizerResponse {
    const scopes = owner?.scopes || []
    return (
      scopes.includes(OAuthScopes.DATABASE_READ) ||
      scopes.includes(OAuthScopes.DATABASE_WRITE) ||
      scopes.includes(OAuthScopes.DATABASE_ADMIN)
    )
  }

  /**
   * Check if user has database write scope
   */
  @allowGuest()
  write(owner: IhttpOwner | null): AuthorizerResponse {
    const scopes = owner?.scopes || []
    return (
      scopes.includes(OAuthScopes.DATABASE_WRITE) || scopes.includes(OAuthScopes.DATABASE_ADMIN)
    )
  }

  /**
   * Check if user has database admin scope
   */
  @allowGuest()
  admin(owner: IhttpOwner | null): AuthorizerResponse {
    const scopes = owner?.scopes || []
    return scopes.includes(OAuthScopes.DATABASE_ADMIN)
  }
}
