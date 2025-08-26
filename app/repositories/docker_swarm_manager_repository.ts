import DockerSwarmManager from '#models/docker_swarm_manager'
import ServiceTypes from '#enums/service_types'
import ClusterTypes from '#enums/cluster_types'
import ClusterHealthStatus from '#enums/cluster_health_status'
import { DateTime } from 'luxon'
import RegionCodes from '#enums/region_codes'

export default class DockerSwarmManagerRepository {
  /**
   * Retrieves a DockerSwarmManager instance by its ID.
   */
  public async findById(id: string): Promise<DockerSwarmManager> {
    return DockerSwarmManager.findOrFail(id)
  }

  /**
   * Retrieves a DockerSwarmManager by ID within token context (ownership-scoped)
   * Returns null if not found in context
   */
  public async findByIdInContext(id: string, ownerId: string): Promise<DockerSwarmManager> {
    const cluster = await DockerSwarmManager.query()
      .where('id', id)
      .where('owner_id', ownerId)
      .first()
    if (!cluster) {
      throw new Error(`DockerSwarmManager with id ${id} not found in context`)
    }
    return cluster
  }

  /**
   * Retrieves all DockerSwarmManager instances within a token context (ownership-scoped)
   */
  public async findAllInContext(ownerId: string): Promise<DockerSwarmManager[]> {
    return DockerSwarmManager.query().where('owner_id', ownerId)
  }

  /**
   * Find shared clusters
   */
  public async findSharedClusters(serviceType: ServiceTypes): Promise<DockerSwarmManager[]> {
    return DockerSwarmManager.query()
      .where('service_type', serviceType)
      .where('cluster_type', ClusterTypes.SHARED)
      .where('is_active', true)
      .orderBy('created_at', 'asc')
  }

  /**
   * Find a private cluster for a specific owner
   */
  public async findPrivateCluster(
    ownerId: string,
    serviceType: ServiceTypes
  ): Promise<DockerSwarmManager> {
    const cluster = await DockerSwarmManager.query()
      .where('owner_id', ownerId)
      .where('service_type', serviceType)
      .where('cluster_type', ClusterTypes.PRIVATE)
      .where('is_active', true)
      .first()
    if (!cluster) {
      throw new Error(
        `DockerSwarmManager with ownerId ${ownerId} and serviceType ${serviceType} not found`
      )
    }
    return cluster
  }

  /**
   * Find a customer-managed cluster for a specific owner
   */
  public async findCustomerManagedCluster(
    ownerId: string,
    serviceType: ServiceTypes
  ): Promise<DockerSwarmManager> {
    const cluster = await DockerSwarmManager.query()
      .where('owner_id', ownerId)
      .where('service_type', serviceType)
      .where('cluster_type', ClusterTypes.CUSTOMER_MANAGED)
      .where('is_active', true)
      .first()
    if (!cluster) {
      throw new Error(
        `DockerSwarmManager with ownerId ${ownerId} and serviceType ${serviceType} not found`
      )
    }
    return cluster
  }

  /**
   * Find the least loaded shared cluster
   */
  public async findLeastLoadedSharedCluster(
    serviceType: ServiceTypes
  ): Promise<DockerSwarmManager> {
    const cluster = await DockerSwarmManager.query()
      .where('service_type', serviceType)
      .where('cluster_type', ClusterTypes.SHARED)
      .where('is_active', true)
      .where('health_status', ClusterHealthStatus.HEALTHY)
      .orderBy('created_at', 'asc')
      .first()
    if (!cluster) {
      throw new Error(`DockerSwarmManager with serviceType ${serviceType} not found`)
    }
    return cluster
  }

  /**
   * Find the least loaded shared cluster in a specific region
   */
  public async findLeastLoadedSharedClusterByRegion(
    regionCode: RegionCodes,
    serviceType: ServiceTypes
  ): Promise<DockerSwarmManager | null> {
    const cluster = await DockerSwarmManager.query()
      .where('service_type', serviceType)
      .where('cluster_type', ClusterTypes.SHARED)
      .where('region_code', regionCode)
      .where('is_active', true)
      .where('health_status', ClusterHealthStatus.HEALTHY)
      .orderBy('created_at', 'asc')
      .first()

    return cluster
  }

  /**
   * Find shared clusters by region
   */
  public async findSharedClustersByRegion(
    regionCode: RegionCodes,
    serviceType: ServiceTypes
  ): Promise<DockerSwarmManager[]> {
    return DockerSwarmManager.query()
      .where('service_type', serviceType)
      .where('cluster_type', ClusterTypes.SHARED)
      .where('region_code', regionCode)
      .where('is_active', true)
      .orderBy('created_at', 'asc')
  }

  /**
   * Find a private cluster for a specific owner in a specific region
   */
  public async findPrivateClusterByRegion(
    ownerId: string,
    regionCode: RegionCodes,
    serviceType: ServiceTypes
  ): Promise<DockerSwarmManager | null> {
    const cluster = await DockerSwarmManager.query()
      .where('owner_id', ownerId)
      .where('service_type', serviceType)
      .where('cluster_type', ClusterTypes.PRIVATE)
      .where('region_code', regionCode)
      .where('is_active', true)
      .first()

    return cluster
  }

  /**
   * Find customer-managed cluster for a specific owner in a specific region
   */
  public async findCustomerManagedClusterByRegion(
    ownerId: string,
    regionCode: RegionCodes,
    serviceType: ServiceTypes
  ): Promise<DockerSwarmManager | null> {
    const cluster = await DockerSwarmManager.query()
      .where('owner_id', ownerId)
      .where('service_type', serviceType)
      .where('cluster_type', ClusterTypes.CUSTOMER_MANAGED)
      .where('region_code', regionCode)
      .where('is_active', true)
      .first()

    return cluster
  }

  /**
   * Find the best cluster for deployment in a specific region with fallback logic
   * Priority: 1) Private cluster for owner, 2) Customer-managed for owner, 3) Shared cluster
   */
  public async findOptimalClusterByRegion(
    regionCode: RegionCodes,
    serviceType: ServiceTypes,
    ownerId: string
  ): Promise<DockerSwarmManager | null> {
    return DockerSwarmManager.query()
      .where('region_code', regionCode)
      .where('service_type', serviceType)
      .where('is_active', true)
      .where('health_status', ClusterHealthStatus.HEALTHY)
      .where((builder) => {
        builder
          // Shared cluster (highest priority - most common use case)
          .where((subBuilder) => {
            subBuilder.whereNull('owner_id').where('cluster_type', ClusterTypes.SHARED)
          })
          // Private cluster for this owner (medium priority)
          .orWhere((subBuilder) => {
            subBuilder.where('owner_id', ownerId).where('cluster_type', ClusterTypes.PRIVATE)
          })
          // Customer-managed cluster for this owner (lowest priority)
          .orWhere((subBuilder) => {
            subBuilder
              .where('owner_id', ownerId)
              .where('cluster_type', ClusterTypes.CUSTOMER_MANAGED)
          })
      })
      .orderBy('created_at', 'asc')
      .first()
  }

  /**
   * Creates a new DockerSwarmManager instance within token context
   */
  public async createInContext(
    data: Partial<DockerSwarmManager>,
    ownerId: string
  ): Promise<DockerSwarmManager> {
    const nameExists = await DockerSwarmManager.query()
      .where('name', data.name!)
      .where('owner_id', ownerId)
      .first()

    if (nameExists) {
      throw new Error('Cluster name already exists for this owner')
    }

    return DockerSwarmManager.create({
      ...data,
      ownerId,
    })
  }

  /**
   * Creates a new shared DockerSwarmManager instance
   */
  public async createSharedCluster(data: Partial<DockerSwarmManager>): Promise<DockerSwarmManager> {
    return DockerSwarmManager.create({
      ...data,
      ownerId: null,
      clusterType: ClusterTypes.SHARED,
    })
  }

  /**
   * Updates health status for a cluster
   */
  public async updateHealthStatus(
    id: string,
    healthStatus: ClusterHealthStatus
  ): Promise<DockerSwarmManager | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge({
      healthStatus,
      lastHealthCheck: DateTime.now(),
    })
    await modelInstance.save()
    return modelInstance
  }
}
