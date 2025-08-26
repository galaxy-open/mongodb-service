import DockerSwarmWorkerRepository from '#repositories/docker_swarm_worker_repository'
import { inject } from '@adonisjs/core'

@inject()
export default class DockerSwarmWorkerService {
  constructor(private workerRepository: DockerSwarmWorkerRepository) {}

  async incrementWorkerCurrentInstancesCount(workerId: string): Promise<void> {
    const worker = await this.workerRepository.findById(workerId)
    if (!worker) {
      throw new Error('Worker not found')
    }
    const currentInstances = worker.currentInstances + 1
    await this.workerRepository.update(workerId, { currentInstances })
  }

  async decrementWorkerCurrentInstancesCount(workerId: string): Promise<void> {
    const worker = await this.workerRepository.findById(workerId)
    if (!worker) {
      throw new Error('Worker not found')
    }
    const currentInstances = worker.currentInstances - 1
    await this.workerRepository.update(workerId, { currentInstances })
  }
}
