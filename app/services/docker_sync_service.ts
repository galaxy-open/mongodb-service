import { inject } from '@adonisjs/core'
import DatabaseInstance from '#models/database_instance'
import InstanceStatus from '#enums/instance_status'
import DockerSyncStatus from '#enums/docker_sync_status'
import OwnerRepository from '#repositories/owner_repository'
import DockerCliService from '#services/docker_cli/docker_cli_service'
import { ServiceDetails } from '#services/docker_cli/types/docker_cli_types'
import DockerSwarmManager from '#models/docker_swarm_manager'

export interface DockerServiceInfo {
  name: string
  status: 'running' | 'stopped' | 'error'
  replicas?: string
  image?: string
}

export interface DockerStackInfo {
  name: string
  services: ServiceDetails[]
}

export interface DatabaseDockerInfo {
  serviceCount: number
  services: DockerServiceInfo[]
  lastChecked: Date
  syncStatus: DockerSyncStatus
}

@inject()
export default class DockerSyncService {
  constructor(
    private dockerCliService: DockerCliService,
    private ownerRepository: OwnerRepository
  ) {}

  /**
   * Get Docker information for a single database
   */
  async getDockerInfoForDatabase(
    database: DatabaseInstance,
    dockerStacksMap?: Map<string, DockerStackInfo>
  ): Promise<DatabaseDockerInfo> {
    const cluster = database.deployment.dockerSwarmManager
    // If a map not provided, fetch it (less efficient but works for single calls)
    const stacksMap = dockerStacksMap || (await this.getDockerStacksMap(cluster))

    const expectedStackName = database.stackName
    const dockerStack = stacksMap.get(expectedStackName)
    const lastChecked = new Date()

    if (!dockerStack) {
      const syncStatus = this.determineSyncStatus(database.status, false)
      return {
        serviceCount: 0,
        services: [],
        lastChecked,
        syncStatus,
      }
    }

    const services = await this.getDetailedServiceInfo(expectedStackName, cluster)
    const isDockerRunning = services.some((s) => s.status === 'running')
    const syncStatus = this.determineSyncStatus(database.status, isDockerRunning)

    return {
      serviceCount: dockerStack.services.length,
      services,
      lastChecked,
      syncStatus,
    }
  }

  /**
   * Get Docker stacks map for efficient bulk operations
   */
  async getDockerStacksMap(cluster: DockerSwarmManager): Promise<Map<string, DockerStackInfo>> {
    const dockerStacks = await this.dockerCliService.run(cluster, (docker) => docker.serviceLs())
    const map = new Map<string, DockerStackInfo>()
    dockerStacks.forEach((stack) => {
      map.set(stack.Name, {
        name: stack.Name,
        services: stack.Services,
      })
    })
    return map
  }

  /**
   * Get detailed service information for a stack
   */
  async getDetailedServiceInfo(
    stackName: string,
    cluster: DockerSwarmManager
  ): Promise<DockerServiceInfo[]> {
    try {
      const allServices = await this.dockerCliService.run(cluster, (docker) => docker.serviceLs())

      const stackServices = allServices.filter(
        (service) =>
          service.Name.startsWith(stackName + '_') || service.Name === stackName + '_standalone'
      )

      return stackServices.map((service) => ({
        name: service.Name,
        status: this.parseServiceStatus(service.Replicas),
        replicas: service.Replicas,
        image: service.Image,
      }))
    } catch (error) {
      console.error(`Failed to get detailed service info for ${stackName}:`, error)
      return []
    }
  }

  /**
   * Find orphaned Docker stacks (exist in Docker but not in provided database list)
   */
  async findOrphanedStacks(databases: DatabaseInstance[], ownerId: string) {
    if (databases.length === 0) return []

    const ownerUsername = await this.ownerRepository.findOwnerUsernameById(ownerId)
    // Create set of expected stack names for efficient lookups
    const expectedStackNames = new Set(databases.map((db) => db.stackName))

    // Group databases by cluster to avoid duplicate cluster queries
    const clusterDatabasesMap = new Map<DockerSwarmManager, DatabaseInstance[]>()
    databases.forEach((db) => {
      const cluster = db.deployment.dockerSwarmManager
      if (!clusterDatabasesMap.has(cluster)) {
        clusterDatabasesMap.set(cluster, [])
      }
      clusterDatabasesMap.get(cluster)!.push(db)
    })

    // Process each cluster and find orphaned stacks
    const promises = Array.from(clusterDatabasesMap.keys()).map(async (cluster) => {
      const dockerServices = await this.dockerCliService.run(cluster, (docker) =>
        docker.serviceLs()
      )

      return dockerServices.filter(
        (service) =>
          !expectedStackNames.has(service.Name) && service.Name.startsWith(`${ownerUsername}_`)
      )
    })

    const results = await Promise.all(promises)

    // Flatten the results from all clusters
    return results.flat()
  }

  /**
   * Get actual Docker status for a database
   */
  async getActualDockerStatus(
    database: DatabaseInstance,
    cluster: DockerSwarmManager
  ): Promise<'running' | 'stopped' | 'error'> {
    const stackName = database.stackName
    const services = await this.getDetailedServiceInfo(stackName, cluster)

    if (services.length === 0) return 'stopped'
    if (services.every((s) => s.status === 'running')) return 'running'
    if (services.some((s) => s.status === 'running')) return 'error'
    return 'stopped'
  }

  /**
   * Check if database status should be updated based on Docker reality
   */
  shouldUpdateDatabaseStatus(
    currentStatus: InstanceStatus,
    dockerStatus: 'running' | 'stopped' | 'error'
  ): boolean {
    // Be conservative - only update clear mismatches
    if (dockerStatus === 'stopped' && currentStatus === InstanceStatus.RUNNING) {
      return true // Docker is down but database thinks it's running
    }

    if (dockerStatus === 'running' && currentStatus === InstanceStatus.STOPPED) {
      return true // Docker is up but database thinks it's stopped
    }

    return false
  }

  /**
   * Map Docker status to InstanceStatus enum
   */
  mapDockerStatusToInstanceStatus(dockerStatus: 'running' | 'stopped' | 'error'): InstanceStatus {
    switch (dockerStatus) {
      case 'running':
        return InstanceStatus.RUNNING
      case 'stopped':
        return InstanceStatus.STOPPED
      case 'error':
        return InstanceStatus.ERROR
      default:
        return InstanceStatus.ERROR
    }
  }

  private determineSyncStatus(
    postgresStatus: InstanceStatus,
    isDockerRunning: boolean
  ): DockerSyncStatus {
    const shouldBeRunning = [
      InstanceStatus.RUNNING,
      InstanceStatus.STARTING,
      InstanceStatus.UPDATING,
    ].includes(postgresStatus)

    if (shouldBeRunning && isDockerRunning) return DockerSyncStatus.SYNCED
    if (!shouldBeRunning && !isDockerRunning) return DockerSyncStatus.SYNCED
    if (shouldBeRunning && !isDockerRunning) return DockerSyncStatus.DB_ONLY
    if (!shouldBeRunning && isDockerRunning) return DockerSyncStatus.DOCKER_ONLY

    return DockerSyncStatus.STATUS_MISMATCH
  }

  private parseServiceStatus(replicas: string): 'running' | 'stopped' | 'error' {
    if (!replicas) return 'error'

    const [current, desired] = replicas.split('/').map((n) => Number.parseInt(n))

    if (current === 0) return 'stopped'
    if (current === desired) return 'running'
    return 'error'
  }
}
