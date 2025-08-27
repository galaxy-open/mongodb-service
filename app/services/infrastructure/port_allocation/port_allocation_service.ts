import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import RegionCodes from '#enums/region_codes'
import DatabaseConnectionRepository from '#repositories/database_connection_repository'
import DefaultPortRange from '#enums/default_port_range'
import TLSModes from '#enums/tls_modes'
import DockerSwarmManager from '#models/docker_swarm_manager'
import SwarmPortAvailabilityChecker from '#services/infrastructure/port_availability/swarm_port_availability_checker'
import RetryHelper from '#services/utilities/retry_helper'

@inject()
export default class PortAllocationService {
  private readonly CONFIG = {
    BATCH_SIZE: 10,
    MAX_BATCHES: 20,
    RETRY_DELAY_MS: 1000,
  }

  constructor(
    private logger: Logger,
    private databaseConnectionRepository: DatabaseConnectionRepository,
    private portAvailabilityChecker: SwarmPortAvailabilityChecker,
    private retryHelper: RetryHelper
  ) {}

  private async generateCandidatePorts(
    regionCode: RegionCodes,
    batchSize: number,
    startFromPort?: number
  ): Promise<number[]> {
    const startPort = DefaultPortRange.Start
    const endPort = DefaultPortRange.End

    if (startFromPort) {
      return this.generatePortsFromPosition(regionCode, startFromPort, batchSize, endPort)
    }

    const highestUsedPort = await this.databaseConnectionRepository.getHighestUsedPort(regionCode)
    const actualStartPort = highestUsedPort ? highestUsedPort + 1 : startPort

    return this.generatePortsFromPosition(regionCode, actualStartPort, batchSize, endPort)
  }

  private async generatePortsFromPosition(
    regionCode: RegionCodes,
    startFromPort: number,
    batchSize: number,
    endPort: number
  ): Promise<number[]> {
    const usedPorts = new Set(await this.databaseConnectionRepository.getUsedPorts(regionCode))

    const candidates: number[] = []
    let currentPort = startFromPort

    while (candidates.length < batchSize && currentPort <= endPort) {
      if (!usedPorts.has(currentPort)) {
        candidates.push(currentPort)
      }
      currentPort++
    }

    if (candidates.length === 0) {
      throw new Error(
        `No available ports found in range ${DefaultPortRange.Start}-${endPort} for region ${regionCode}`
      )
    }

    this.logger.debug(
      {
        regionCode,
        batchSize,
        candidatesFound: candidates.length,
        startFromPort,
        candidates,
      },
      'Generated candidate ports for allocation'
    )

    return candidates
  }

  /**
   * Allocates and immediately reserves a port for a database instance using batch processing.
   * This prevents port collisions by checking actual infrastructure port usage in batches
   * and continues searching until an available port is found.
   */
  async allocateAndReservePort(
    databaseInstanceId: string,
    regionCode: RegionCodes,
    tlsMode: TLSModes,
    cluster: DockerSwarmManager,
    targetWorkers: string[]
  ): Promise<number> {
    const port = await this.allocatePort(regionCode, cluster, targetWorkers)
    await this.reservePort(databaseInstanceId, regionCode, port, tlsMode)
    return port
  }

  private async allocatePort(
    regionCode: RegionCodes,
    cluster: DockerSwarmManager,
    targetWorkers: string[]
  ): Promise<number> {
    let lastCheckedPort: number | undefined

    return this.retryHelper.execute(
      async () => {
        const candidatePorts = await this.getNextBatch(
          regionCode,
          lastCheckedPort,
          this.CONFIG.BATCH_SIZE
        )

        const availablePort = await this.findAvailablePort(candidatePorts, cluster, targetWorkers)

        if (availablePort) {
          return availablePort
        }

        lastCheckedPort = Math.max(...candidatePorts)
        throw new Error('No available ports in current batch')
      },
      {
        maxAttempts: this.CONFIG.MAX_BATCHES,
        delayMs: this.CONFIG.RETRY_DELAY_MS,
        operation: `Port allocation in region ${regionCode}`,
        onRetry: (attempt, maxAttempts) => {
          this.logger.warn(
            { attempt, maxAttempts, lastCheckedPort, regionCode },
            'Port allocation attempt failed, retrying with next batch...'
          )
        },
        onSuccess: (attempt, totalTimeMs) => {
          this.logger.info({ attempt, totalTimeMs, regionCode }, 'Port allocation succeeded')
        },
      }
    )
  }

  private async getNextBatch(
    regionCode: RegionCodes,
    lastCheckedPort: number | undefined,
    batchSize: number
  ): Promise<number[]> {
    const candidatePorts = await this.generateCandidatePorts(
      regionCode,
      batchSize,
      lastCheckedPort ? lastCheckedPort + 1 : undefined
    )

    if (candidatePorts.length === 0) {
      this.logger.error(
        { regionCode, lastCheckedPort, batchSize },
        'No more candidate ports available'
      )
      throw new Error('No more candidate ports available')
    }

    return candidatePorts
  }

  private async findAvailablePort(
    candidatePorts: number[],
    cluster: DockerSwarmManager,
    targetWorkers: string[]
  ): Promise<number | null> {
    const portAvailability = await this.portAvailabilityChecker.arePortsAvailable({
      cluster,
      ports: candidatePorts,
      workers: targetWorkers,
    })

    return candidatePorts.find((port) => portAvailability[port]) || null
  }

  private async reservePort(
    databaseInstanceId: string,
    regionCode: RegionCodes,
    port: number,
    tlsMode: TLSModes
  ): Promise<void> {
    await this.databaseConnectionRepository.upsert(databaseInstanceId, {
      regionCode,
      port,
      tlsMode,
    })

    this.logger.info(
      { port, regionCode, databaseInstanceId },
      'Port reserved successfully in database'
    )
  }
}
