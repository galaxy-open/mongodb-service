import WorkerTypes from '#enums/worker_types'
import DockerSwarmWorker from '#models/docker_swarm_worker'

export default class DockerSwarmWorkerRepository {
  /**
   * Find worker node by manager ID and name
   */
  async findByManagerIdAndName(
    dockerSwarmManagerId: string,
    name: string
  ): Promise<DockerSwarmWorker> {
    const worker = await DockerSwarmWorker.query()
      .where('docker_swarm_manager_id', dockerSwarmManagerId)
      .where('name', name)
      .where('is_active', true)
      .preload('dockerSwarmManager')
      .first()
    if (!worker) {
      throw new Error(
        `DockerSwarmWorker with managerId ${dockerSwarmManagerId} and name ${name} not found`
      )
    }
    return worker
  }

  /**
   * Find worker node by ID
   */
  async findById(id: string): Promise<DockerSwarmWorker> {
    return DockerSwarmWorker.findOrFail(id)
  }

  /**
   * Find active worker nodes by type and manager ID
   */
  async findByTypeAndManagerId(
    type: WorkerTypes,
    dockerSwarmManagerId: string
  ): Promise<DockerSwarmWorker[]> {
    return DockerSwarmWorker.query()
      .where('type', type)
      .where('docker_swarm_manager_id', dockerSwarmManagerId)
      .where('is_active', true)
      .preload('dockerSwarmManager')
      .orderBy('name', 'asc')
  }

  /**
   * Get an available worker node by type and manager ID - load balanced
   */
  async getAvailableWorkerByType(
    type: WorkerTypes,
    dockerSwarmManagerId: string
  ): Promise<DockerSwarmWorker> {
    const worker = await DockerSwarmWorker.query()
      .where('type', type)
      .where('docker_swarm_manager_id', dockerSwarmManagerId)
      .where('is_active', true)
      .whereColumn('current_instances', '<', 'max_instances')
      .orderBy('current_instances', 'asc')
      .preload('dockerSwarmManager')
      .first()

    if (!worker) {
      throw new Error(
        `No available worker of type ${type} found in cluster ${dockerSwarmManagerId}`
      )
    }

    return worker
  }

  /**
   * Create a new worker node
   */
  async create(data: Partial<DockerSwarmWorker>): Promise<DockerSwarmWorker> {
    return DockerSwarmWorker.create(data)
  }

  /**
   * Update a worker node
   */
  async update(id: string, data: Partial<DockerSwarmWorker>): Promise<DockerSwarmWorker | null> {
    const worker = await this.findById(id)
    if (!worker) {
      return null
    }
    worker.merge(data)
    await worker.save()
    return worker
  }

  /**
   * Delete a worker node
   */
  async delete(id: string): Promise<boolean> {
    const worker = await this.findById(id)
    if (!worker) {
      return false
    }
    await worker.delete()
    return true
  }

  /**
   * Find workers by Docker Swarm Manager ID
   */
  async findByManagerId(dockerSwarmManagerId: string): Promise<DockerSwarmWorker[]> {
    return DockerSwarmWorker.query()
      .where('docker_swarm_manager_id', dockerSwarmManagerId)
      .preload('dockerSwarmManager')
      .orderBy('name', 'asc')
  }

  /**
   * Find all workers with their relations
   */
  async findWithRelations(id: string): Promise<DockerSwarmWorker> {
    const worker = await DockerSwarmWorker.query()
      .where('id', id)
      .preload('dockerSwarmManager')
      .first()
    if (!worker) {
      throw new Error(`DockerSwarmWorker with id ${id} not found`)
    }
    return worker
  }
}
