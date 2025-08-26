import OAuthScopes from '#enums/oauth_scopes'

export interface OAuthScope {
  scope: string
  description: string
  category?: string
}

export const oauthScopesConfig = {
  /**
   * Default scope granted when none is specified
   */
  defaultScope: OAuthScopes.DATABASE_READ,

  /**
   * Available OAuth scopes and their descriptions
   */
  scopes: {
    [OAuthScopes.DATABASE_READ]: {
      description: 'View your databases',
      category: 'database',
    },
    [OAuthScopes.DATABASE_WRITE]: {
      description: 'Manage your databases',
      category: 'database',
    },
    [OAuthScopes.DATABASE_ADMIN]: {
      description: 'Full administrative access to database instances',
      category: 'database',
    },
    [OAuthScopes.ORGANIZATION_READ]: {
      description: 'View organization information',
      category: 'organization',
    },
    [OAuthScopes.ORGANIZATION_MANAGE]: {
      description: 'Manage organization settings and members',
      category: 'organization',
    },
  },

  /**
   * Scope categories for grouping in UI
   */
  categories: {
    database: 'Database Access',
    organization: 'Organization Management',
  },
}

export default oauthScopesConfig

/**
 * Helper function to get formatted scopes for display
 */
export function formatScopes(scopeNames: string[]): OAuthScope[] {
  return scopeNames.map((scopeName) => {
    const scopeConfig = oauthScopesConfig.scopes[scopeName as keyof typeof oauthScopesConfig.scopes]
    return {
      scope: scopeName,
      description: scopeConfig?.description || `Access to ${scopeName}`,
      category: scopeConfig?.category,
      isDefault: scopeName === oauthScopesConfig.defaultScope,
    }
  })
}

/**
 * Helper function to validate if scopes are allowed
 */
export function validateScopes(requestedScopes: string[]): boolean {
  const allowedScopes = Object.keys(oauthScopesConfig.scopes)
  return requestedScopes.every((scope) => allowedScopes.includes(scope))
}

/**
 * Get the default scope
 */
export function getDefaultScope(): string {
  return oauthScopesConfig.defaultScope
}

export function parseScopes(scopeString?: string): string[] {
  if (!scopeString) return [getDefaultScope()]
  return scopeString.split(' ').filter(Boolean)
}
