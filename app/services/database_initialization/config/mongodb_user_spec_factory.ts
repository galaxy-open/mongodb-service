import { DatabaseUserSpec } from '#interfaces/database_initialization'
import { DatabaseConstants } from '#services/database_initialization/config/database_constants'

/**
 * Factory for creating MongoDB user specifications.
 * Handles the creation of default and custom user specs with proper role assignments.
 */
export default class MongoDBUserSpecFactory {
  /**
   * Get default user specifications for MongoDB initialization.
   * Creates admin, monitor, and backup users with appropriate roles.
   */
  static getDefaultUserSpecs(
    adminPassword: string,
    monitorPassword: string,
    backupPassword: string
  ): DatabaseUserSpec[] {
    return [
      {
        username: DatabaseConstants.DEFAULT_USERS.ADMIN,
        password: adminPassword,
        roles: [
          {
            role: DatabaseConstants.MONGODB.ROLES.ROOT,
            db: DatabaseConstants.MONGODB.DATABASES.ADMIN,
          },
          {
            role: DatabaseConstants.MONGODB.ROLES.USER_ADMIN_ANY_DATABASE,
            db: DatabaseConstants.MONGODB.DATABASES.ADMIN,
          },
        ],
      },
      {
        username: DatabaseConstants.DEFAULT_USERS.MONITOR,
        password: monitorPassword,
        roles: [
          {
            role: DatabaseConstants.MONGODB.ROLES.CLUSTER_MONITOR,
            db: DatabaseConstants.MONGODB.DATABASES.ADMIN,
          },
        ],
      },
      {
        username: DatabaseConstants.DEFAULT_USERS.BACKUP,
        password: backupPassword,
        roles: [
          {
            role: DatabaseConstants.MONGODB.ROLES.BACKUP,
            db: DatabaseConstants.MONGODB.DATABASES.ADMIN,
          },
          {
            role: DatabaseConstants.MONGODB.ROLES.READ,
            db: DatabaseConstants.MONGODB.DATABASES.LOCAL,
          },
        ],
      },
    ]
  }
}
