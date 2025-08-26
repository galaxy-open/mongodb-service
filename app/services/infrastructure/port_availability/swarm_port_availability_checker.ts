import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DockerCliService from '#services/docker_cli/docker_cli_service'
import DockerSwarmManager from '#models/docker_swarm_manager'

@inject()
export default class SwarmPortAvailabilityChecker {
  constructor(
    private logger: Logger,
    private dockerCliService: DockerCliService
  ) {}

  async isPortAvailable(cluster: DockerSwarmManager, port: number): Promise<boolean> {
    try {
      const usedPorts = await this.getUsedPorts(cluster)
      return !usedPorts.has(port)
    } catch (error) {
      this.logger.error({ error: error.message, port }, 'Port availability check failed')
      return true
    }
  }

  private async getUsedPorts(cluster: DockerSwarmManager): Promise<Set<number>> {
    const services = await this.dockerCliService.run(cluster, (docker) => docker.serviceLs())
    const ports = new Set<number>()
    const portRegex = /(\d+)(?:->|:)/g

    for (const service of services) {
      if (!service.Ports) continue

      let match
      while ((match = portRegex.exec(service.Ports)) !== null) {
        const port = Number.parseInt(match[1], 10)
        if (port > 0 && port < 65536) {
          ports.add(port)
        }
      }
    }

    return ports
  }
}
