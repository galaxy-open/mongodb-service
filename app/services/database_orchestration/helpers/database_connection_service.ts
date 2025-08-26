import DatabaseConnectionRepository from '#repositories/database_connection_repository'
import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import RegionCodes from '#enums/region_codes'
import DatabaseConnection from '#models/database_connection'
import TLSModes from '#enums/tls_modes'
import DockerSwarmManager from '#models/docker_swarm_manager'
import SwarmPortAvailabilityChecker from '#services/infrastructure/port_availability/swarm_port_availability_checker'

@inject()
export default class DatabaseConnectionService {
  constructor(
    protected databaseConnectionRepository: DatabaseConnectionRepository,
    protected logger: Logger,
    protected portAvailabilityChecker: SwarmPortAvailabilityChecker
  ) {}

  /**
   * Get connection information for a database instance
   */
  async getConnectionByDatabaseInstanceId(
    databaseInstanceId: string
  ): Promise<DatabaseConnection | null> {
    const connection =
      await this.databaseConnectionRepository.findByDatabaseInstanceId(databaseInstanceId)

    return connection
  }

  /**
   * Allocates and immediately reserves a port for a database instance.
   * This prevents port collisions by checking actual infrastructure port usage
   * and continues searching until an available port is found.
   */
  async allocateAndReservePort(
    databaseInstanceId: string,
    regionCode: RegionCodes,
    tlsMode: TLSModes,
    cluster: DockerSwarmManager
  ): Promise<number> {
    let attempts = 0
    const maxSafetyAttempts = 100 // Safety valve to prevent infinite loops

    while (attempts < maxSafetyAttempts) {
      attempts++

      try {
        // Get next available port from database
        const port = await this.databaseConnectionRepository.findNextAvailablePort(regionCode)

        // Check if port is actually available on infrastructure
        const isPortAvailable = await this.portAvailabilityChecker.isPortAvailable(cluster, port)

        if (!isPortAvailable) {
          this.logger.warn(
            {
              port,
              regionCode,
              databaseInstanceId,
              attempt: attempts,
            },
            'Port is in use on infrastructure, marking as unavailable and trying next port'
          )

          // Mark this port as unavailable by creating a placeholder record
          await this.databaseConnectionRepository.create({
            databaseInstanceId: `placeholder-${Date.now()}-${Math.random()}`,
            regionCode,
            port,
            tlsMode,
          })

          continue
        }

        await this.databaseConnectionRepository.upsert(databaseInstanceId, {
          regionCode,
          port,
          tlsMode,
        })

        this.logger.info(
          {
            port,
            regionCode,
            databaseInstanceId,
            attempts,
          },
          'Port allocated and reserved successfully'
        )

        return port
      } catch (error) {
        this.logger.warn(
          {
            error: error.message,
            regionCode,
            databaseInstanceId,
            attempt: attempts,
          },
          'Error during port allocation attempt, retrying'
        )

        // Small delay before retry to avoid hammering the system
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    throw new Error(
      `Failed to find an available port after ${maxSafetyAttempts} attempts in region ${regionCode}. This might indicate a system issue or port range exhaustion.`
    )
  }
}
