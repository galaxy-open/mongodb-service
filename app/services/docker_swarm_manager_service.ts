import DockerSwarmManager from '#models/docker_swarm_manager'
import DockerSwarmWorker from '#models/docker_swarm_worker'
import { inject } from '@adonisjs/core'
import DockerSwarmManagerRepository from '#repositories/docker_swarm_manager_repository'
import WorkerTypes from '#enums/worker_types'
import ServiceTypes from '#enums/service_types'
import DockerSwarmWorkerRepository from '#repositories/docker_swarm_worker_repository'
import RegionCodes from '#enums/region_codes'

@inject()
export default class DockerSwarmManagerService {
  constructor(
    protected dockerSwarmManagerRepository: DockerSwarmManagerRepository,
    protected dockerSwarmWorkerRepository: DockerSwarmWorkerRepository
  ) {}

  /**
   * Select the best cluster for deployment based on the routing algorithm
   */
  public async selectCluster(
    serviceType: ServiceTypes,
    ownerId?: string
  ): Promise<DockerSwarmManager | null> {
    // Shared cluster (load balanced)
    if (!ownerId) {
      return this.dockerSwarmManagerRepository.findLeastLoadedSharedCluster(serviceType)
    }

    // Private cluster (if an owner specified)
    const privateCluster = await this.dockerSwarmManagerRepository.findPrivateCluster(
      ownerId,
      serviceType
    )

    if (privateCluster) {
      return privateCluster
    }

    // Customer-managed cluster
    return await this.dockerSwarmManagerRepository.findCustomerManagedCluster(ownerId, serviceType)
  }

  /**
   * Select the best cluster for deployment in a specific region
   */
  public async selectClusterByRegion(
    regionCode: RegionCodes,
    serviceType: ServiceTypes,
    ownerId: string
  ): Promise<DockerSwarmManager | null> {
    return this.dockerSwarmManagerRepository.findOptimalClusterByRegion(
      regionCode,
      serviceType,
      ownerId
    )
  }

  /**
   * Get optimal worker for deployment by region and type (cluster-first approach)
   */
  public async getOptimalWorkerForDeployment(
    regionCode: RegionCodes,
    workerType: WorkerTypes,
    serviceType: ServiceTypes,
    ownerId: string
  ): Promise<DockerSwarmWorker> {
    // First, select the optimal cluster
    const cluster = await this.selectClusterByRegion(regionCode, serviceType, ownerId)

    if (!cluster) {
      throw new Error(`No available cluster found in region ${regionCode}`)
    }

    // Then, select the optimal worker within that cluster
    return this.dockerSwarmWorkerRepository.getAvailableWorkerByType(workerType, cluster.id)
  }

  public async getClusterWorkers(
    regionCode: RegionCodes,
    serviceType: ServiceTypes,
    ownerId: string
  ): Promise<DockerSwarmWorker[]> {
    const cluster = await this.selectClusterByRegion(regionCode, serviceType, ownerId)

    if (!cluster) {
      throw new Error(`No available cluster found in region ${regionCode}`)
    }

    return this.dockerSwarmWorkerRepository.findByTypeAndManagerId(WorkerTypes.WORKER, cluster.id)
  }
}
