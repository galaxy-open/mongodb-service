import { BaseSeeder } from '@adonisjs/lucid/seeders'
import WorkerTypes from '#enums/worker_types'
import DockerSwarmWorker from '#models/docker_swarm_worker'
import DockerSwarmManager from '#models/docker_swarm_manager'
import ServiceTypes from '#enums/service_types'

const createWorker = (dockerSwarmManagerId: string) => [
  {
    name: 'worker-1',
    workerNumber: 1,
    type: WorkerTypes.WORKER,
    isActive: true,
    instanceType: 'm5.large',
    maxInstances: 1000,
    currentInstances: 0,
    dockerSwarmManagerId,
  },
  {
    name: 'worker-2',
    workerNumber: 2,
    type: WorkerTypes.WORKER,
    isActive: true,
    instanceType: 'm5.large',
    maxInstances: 1000,
    currentInstances: 0,
    dockerSwarmManagerId,
  },
  {
    name: 'worker-3',
    workerNumber: 3,
    type: WorkerTypes.WORKER,
    isActive: true,
    instanceType: 'm5.large',
    maxInstances: 1000,
    currentInstances: 0,
    dockerSwarmManagerId,
  },
  {
    name: 'worker-3',
    workerNumber: 3,
    type: WorkerTypes.SERVICE,
    isActive: true,
    instanceType: 'm5.large',
    maxInstances: 1000,
    currentInstances: 0,
    dockerSwarmManagerId,
  },
]

export default class extends BaseSeeder {
  async run() {
    // Get the first docker swarm manager to associate workers with
    const mongoDbManager = await DockerSwarmManager.query()
      .where('service_type', ServiceTypes.MONGODB)
      .first()
    if (!mongoDbManager) {
      console.log('No MongoDB Docker Swarm Manager found. Skipping worker creation.')
      return
    }
    const mongoDbWorkers = createWorker(mongoDbManager.id)
    await DockerSwarmWorker.createMany(mongoDbWorkers)
  }
}
