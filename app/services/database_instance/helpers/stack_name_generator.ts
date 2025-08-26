import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import string from '@adonisjs/core/helpers/string'
import DatabaseInstanceRepository from '#repositories/database_instance_repository'

/**
 * Service responsible for generating unique stack names for database instances.
 * Uses industry-standard 12-character UUID-based IDs that are DNS-safe and Docker-compatible.
 */
@inject()
export default class StackNameGenerator {
  constructor(
    private databaseInstanceRepository: DatabaseInstanceRepository,
    private logger: Logger
  ) {}

  /**
   * Generates a unique stack name using UUID v4.
   * Checks database for existing stackNames and retries if needed.
   *
   * @param maxAttempts - Maximum number of attempts to find a unique name (default: 30)
   * @returns Promise<string> - A unique DNS-safe stack name
   * @throws Error if unable to generate unique name after maxAttempts
   */
  async generateUniqueStackName(maxAttempts: number = 30): Promise<string> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const stackName = this.generateDnsSafeUuid()

      const existing = await this.databaseInstanceRepository.findByStackName(stackName)

      if (!existing) {
        if (attempt > 1) {
          this.logger.info(
            { stackName, attempts: attempt },
            'Generated unique stack name after retries'
          )
        }
        return stackName
      }

      // Log collision for monitoring (very rare with UUID-based generation)
      this.logger.warn(
        { attempt, stackName, maxAttempts },
        'Stack name collision detected - generating new UUID'
      )

      if (attempt === maxAttempts) {
        throw new Error(
          `Failed to generate unique stack name after ${maxAttempts} attempts. Last attempted: ${stackName}`
        )
      }
    }

    // TypeScript exhaustiveness check - should never reach here
    throw new Error('Unexpected error in stack name generation')
  }

  /**
   * Generates a DNS-safe UUID-based stack name.
   * Takes UUID v4 and makes it compatible with DNS, Docker, and MongoDB naming requirements:
   * - Removes hyphens (DNS requirement)
   * - Uses only lowercase letters and digits
   * - Starts with a letter (DNS requirement)
   * - 12 characters (industry standard length)
   *
   * @returns string - A 12-character DNS-safe UUID-based stack name
   */
  private generateDnsSafeUuid(): string {
    // Generate UUID and make it DNS-safe
    let uuid = string.uuid().toLowerCase().replace(/-/g, '')

    // Ensure it starts with a letter (DNS requirement)
    if (!/^[a-z]/.test(uuid)) {
      const letters = 'abcdefghijklmnopqrstuvwxyz'
      uuid = letters[Math.floor(Math.random() * letters.length)] + uuid.slice(1)
    }

    // Return first 12 characters for consistency with cloud provider patterns
    return uuid.slice(0, 12)
  }
}
