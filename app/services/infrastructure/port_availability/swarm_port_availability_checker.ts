import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DockerCliService from '#services/docker_cli/docker_cli_service'
import DockerSwarmManager from '#models/docker_swarm_manager'
import SwarmPortsLogParser from '#services/infrastructure/port_availability/swarm_ports_log_parser'
import cache from '@adonisjs/cache/services/main'

@inject()
export default class SwarmPortAvailabilityChecker {
  private readonly CONFIG = {
    CACHE_TTL_SECONDS: 60,
    LOG_TAIL_COUNT: 10,
  }

  constructor(
    private logger: Logger,
    private dockerCliService: DockerCliService,
    private logParser: SwarmPortsLogParser
  ) {}

  /**
   * Check multiple ports at once for better performance
   */
  async arePortsAvailable(params: {
    cluster: DockerSwarmManager
    ports: number[]
    workers: string[]
  }): Promise<Record<number, boolean>> {
    const { cluster, ports, workers } = params

    if (workers.length === 0) {
      throw new Error('No workers specified to check port availability')
    }

    const portsByWorker = await this.getPortsByWorker(cluster)
    const results: Record<number, boolean> = {}

    for (const port of ports) {
      const workerResults = this.checkPortOnWorkers(port, workers, portsByWorker)
      const availableCount = Object.values(workerResults).filter(Boolean).length
      results[port] = availableCount === workers.length
    }

    this.logger.debug({ ports, workers, results }, 'Batch port availability check completed')

    return results
  }

  private checkPortOnWorkers(
    port: number,
    workers: string[],
    portsByWorker: Record<string, Set<number>>
  ): Record<string, boolean> {
    const results: Record<string, boolean> = {}

    for (const workerName of workers) {
      const workerPorts = portsByWorker[workerName] || new Set<number>()
      results[workerName] = !workerPorts.has(port)
    }

    return results
  }

  private async getPortsByWorker(
    cluster: DockerSwarmManager
  ): Promise<Record<string, Set<number>>> {
    const cacheKey = `swarm-ports:${cluster.id}`

    try {
      const cached = await cache.get({ key: cacheKey })
      if (cached) {
        this.logger.debug('Using cached port data from Redis')
        return this.convertArraysToSets(cached as Record<string, number[]>)
      }
    } catch (error) {
      this.logger.warn({ error: error.message }, 'Failed to get cached port data, fetching fresh')
    }

    this.logger.debug('Cache miss - fetching fresh port data')
    const portsByWorker = await this.fetchPortsByWorker(cluster)

    try {
      const serializableData = this.convertSetsToArrays(portsByWorker)
      await cache.set({
        key: cacheKey,
        value: serializableData,
        ttl: `${this.CONFIG.CACHE_TTL_SECONDS}s`,
      })
    } catch (error) {
      this.logger.warn({ error: error.message }, 'Failed to cache port data')
    }

    return portsByWorker
  }

  private async fetchPortsByWorker(
    cluster: DockerSwarmManager
  ): Promise<Record<string, Set<number>>> {
    try {
      const result = await this.dockerCliService.run(cluster, (docker) =>
        docker.serviceLogs('swarm-ports-brief', {
          tail: this.CONFIG.LOG_TAIL_COUNT,
          timestamps: false,
        })
      )

      return this.logParser.parsePortsFromLogs(result.stdout)
    } catch (error) {
      this.logger.error({ error: error.message }, 'Failed to retrieve port logs')
      throw new Error(
        `Unable to check port availability: service logs not available. ${error.message}`
      )
    }
  }

  private convertSetsToArrays(data: Record<string, Set<number>>): Record<string, number[]> {
    return Object.fromEntries(
      Object.entries(data).map(([worker, ports]) => [worker, Array.from(ports)])
    )
  }

  private convertArraysToSets(data: Record<string, number[]>): Record<string, Set<number>> {
    return Object.fromEntries(
      Object.entries(data).map(([worker, ports]) => [worker, new Set(ports)])
    )
  }
}
