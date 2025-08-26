import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import { MongoClient } from 'mongodb'
import Sanitizer from '#services/utilities/sanitizer'
import RetryHelper from '#services/utilities/retry_helper'
import { DatabaseUser, DatabaseUserSpec } from '#interfaces/database_initialization'
import { DatabaseConstants } from '#services/database_initialization/config/database_constants'

/**
 * Native MongoDB service using the official Node.js driver.
 * Replaces Docker-based mongosh commands with direct database connections.
 */
@inject()
export default class MongoDBDriverService {
  constructor(
    private logger: Logger,
    private retryHelper: RetryHelper
  ) {}

  /**
   * Test MongoDB connection using native driver.
   */
  async testConnection(connectionUri: string): Promise<boolean> {
    try {
      this.logger.debug(
        {
          connectionUri: Sanitizer.sanitizeURI(connectionUri),
        },
        'Testing MongoDB connection with native driver'
      )

      await this.withMongoClient(connectionUri, async (client) => {
        // Test basic admin operation
        const db = client.db('admin')
        const result = await db.command({ ping: 1 })

        if (result.ok !== 1) {
          this.logger.warn({ result }, 'MongoDB ping command returned non-ok result')
          throw new Error('MongoDB ping command failed')
        }
      })

      this.logger.debug('MongoDB connection test successful')
      return true
    } catch (error) {
      this.logger.debug(
        {
          error: error.message,
          connectionUri: Sanitizer.sanitizeURI(connectionUri),
        },
        'MongoDB connection test failed'
      )
      return false
    }
  }

  /**
   * Test MongoDB connection with retry mechanism.
   * Retries for up to 5 minutes with 10-second intervals.
   */
  async testConnectionWithRetry(connectionUri: string): Promise<boolean> {
    const maxRetryDuration = DatabaseConstants.TIMEOUTS.CONNECTION_RETRY_DURATION
    const retryInterval = DatabaseConstants.TIMEOUTS.CONNECTION_RETRY_INTERVAL
    const maxAttempts = Math.ceil(maxRetryDuration / retryInterval)

    this.logger.debug({ connectionUri }, 'Validating MongoDB connection with retry mechanism')

    try {
      const result = await this.retryHelper.execute(() => this.testConnection(connectionUri), {
        maxAttempts,
        delayMs: retryInterval,
        operation: 'MongoDB connection validation',
      })
      return result
    } catch (error) {
      // RetryHelper throws on failure, but we want to return false
      this.logger.error('MongoDB connection validation failed after all retry attempts')
      return false
    }
  }

  /**
   * Execute admin command using native driver.
   */
  async executeAdminCommand(connectionUri: string, command: object): Promise<any> {
    try {
      this.logger.debug({ command }, 'Executing MongoDB admin command')

      const result = await this.withMongoClient(connectionUri, async (client) => {
        const db = client.db('admin')
        return await db.command(command)
      })

      this.logger.debug({ result }, 'Admin command executed successfully')
      return result
    } catch (error) {
      this.logger.error(
        {
          error: error.message,
          command,
          connectionUri: Sanitizer.sanitizeURI(connectionUri),
        },
        'Admin command failed'
      )
      throw error
    }
  }

  /**
   * Check if a user exists in MongoDB.
   */
  async checkUserExists(connectionUri: string, username: string): Promise<boolean> {
    try {
      const result = await this.executeAdminCommand(connectionUri, {
        usersInfo: { user: username, db: 'admin' },
      })

      return result.users && result.users.length > 0
    } catch (error) {
      return false
    }
  }

  /**
   * Create a MongoDB user with specified roles.
   */
  async createUser(
    connectionUri: string,
    username: string,
    password: string,
    roles: Array<{ role: string; db: string }>
  ): Promise<void> {
    try {
      await this.executeAdminCommand(connectionUri, {
        createUser: username,
        pwd: password,
        roles: roles,
      })

      this.logger.info({ username }, 'MongoDB user created successfully')
    } catch (error) {
      this.logger.error({ username, error: error.message }, 'Failed to create MongoDB user')
      throw new Error(`Failed to create user ${username}: ${error.message}`)
    }
  }

  /**
   * Update roles for an existing MongoDB user.
   */
  async updateUserRoles(
    connectionUri: string,
    username: string,
    roles: Array<{ role: string; db: string }>
  ): Promise<void> {
    try {
      await this.executeAdminCommand(connectionUri, {
        updateUser: username,
        roles: roles,
      })

      this.logger.info({ username }, 'MongoDB user roles updated successfully')
    } catch (error) {
      this.logger.error({ username, error: error.message }, 'Failed to update MongoDB user roles')
      throw new Error(`Failed to update user roles for ${username}: ${error.message}`)
    }
  }

  /**
   * Drop a MongoDB user.
   */
  async dropUser(connectionUri: string, username: string): Promise<void> {
    try {
      await this.executeAdminCommand(connectionUri, {
        dropUser: username,
      })

      this.logger.info({ username }, 'MongoDB user dropped successfully')
    } catch (error) {
      this.logger.error({ username, error: error.message }, 'Failed to drop MongoDB user')
      throw new Error(`Failed to drop user ${username}: ${error.message}`)
    }
  }

  /**
   * List all MongoDB users.
   */
  async listUsers(connectionUri: string): Promise<string[]> {
    try {
      const result = await this.executeAdminCommand(connectionUri, { usersInfo: 1 })

      if (result.users && Array.isArray(result.users)) {
        return result.users.map((user: any) => user.user)
      }

      return []
    } catch (error) {
      this.logger.error({ error: error.message }, 'Failed to list MongoDB users')
      return []
    }
  }

  /**
   * Validate replica set status.
   */
  async validateReplicaSetStatus(connectionUri: string): Promise<any> {
    return await this.executeAdminCommand(connectionUri, { replSetGetStatus: 1 })
  }

  /**
   * List collections in admin database.
   */
  async listCollections(connectionUri: string): Promise<any> {
    return await this.executeAdminCommand(connectionUri, { listCollections: 1, nameOnly: true })
  }

  /**
   * Create multiple MongoDB users using individual operations.
   */
  async createUsersWithTransaction(
    connectionUri: string,
    userSpecs: DatabaseUserSpec[]
  ): Promise<DatabaseUser[]> {
    const createdUsers: DatabaseUser[] = []
    const usersToRollback: string[] = []

    try {
      this.logger.info(
        { userCount: userSpecs.length },
        'Starting user creation with individual operations'
      )

      for (const userSpec of userSpecs) {
        try {
          this.logger.debug({ username: userSpec.username }, 'Processing user')

          // Check if user exists
          const userExists = await this.checkUserExists(connectionUri, userSpec.username)

          if (userExists) {
            this.logger.info({ username: userSpec.username }, 'User exists, updating roles')
            await this.updateUserRoles(connectionUri, userSpec.username, userSpec.roles)

            // Build user result
            const roleStrings = userSpec.roles.map((role) => `${role.role}@${role.db}`)
            createdUsers.push({
              username: userSpec.username,
              roles: roleStrings,
            })
            continue
          }

          this.logger.info({ username: userSpec.username }, 'Creating new user')
          await this.createUser(connectionUri, userSpec.username, userSpec.password, userSpec.roles)
          usersToRollback.push(userSpec.username)

          // Build user result
          const roleStrings = userSpec.roles.map((role) => `${role.role}@${role.db}`)
          createdUsers.push({
            username: userSpec.username,
            roles: roleStrings,
          })
        } catch (error) {
          this.logger.error(
            { username: userSpec.username, error: error.message },
            'Failed to process user, rolling back created users'
          )

          // Rollback any users created so far
          await this.rollbackCreatedUsers(connectionUri, usersToRollback)
          throw error
        }
      }

      this.logger.info({ userCount: createdUsers.length }, 'User creation completed successfully')
      return createdUsers
    } catch (error) {
      this.logger.error(
        { error: error.message, userCount: userSpecs.length },
        'User creation failed - manual rollback completed'
      )
      throw new Error(`Failed to create users: ${error.message}`)
    }
  }

  /**
   * Rollback users created during failed user creation.
   */
  private async rollbackCreatedUsers(connectionUri: string, usernames: string[]): Promise<void> {
    if (usernames.length === 0) return

    this.logger.info(
      { usernames, userCount: usernames.length },
      'Rolling back created users due to failure'
    )

    for (const username of usernames) {
      try {
        await this.dropUser(connectionUri, username)
        this.logger.debug({ username }, 'Successfully rolled back user')
      } catch (rollbackError) {
        this.logger.warn(
          { username, error: rollbackError.message },
          'Failed to rollback user - may require manual cleanup'
        )
      }
    }
  }

  /**
   * Create and connect to MongoDB client with standard configuration.
   * Handles connection setup and cleanup automatically.
   */
  private async withMongoClient<T>(
    connectionUri: string,
    operation: (client: MongoClient) => Promise<T>
  ): Promise<T> {
    let client: MongoClient | null = null

    try {
      client = new MongoClient(connectionUri, {
        serverSelectionTimeoutMS: DatabaseConstants.TIMEOUTS.CLIENT_SERVER_SELECTION_TIMEOUT,
        connectTimeoutMS: DatabaseConstants.TIMEOUTS.CLIENT_CONNECT_TIMEOUT,
        socketTimeoutMS: DatabaseConstants.TIMEOUTS.CLIENT_SOCKET_TIMEOUT,
      })
      await client.connect()
      return await operation(client)
    } finally {
      if (client) {
        try {
          await client.close()
        } catch (closeError) {
          this.logger.debug('Error closing MongoDB connection:', closeError)
        }
      }
    }
  }
}
