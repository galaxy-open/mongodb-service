import { BaseSeeder } from '@adonisjs/lucid/seeders'
import DockerSwarmManager from '#models/docker_swarm_manager'
import ServiceTypes from '#enums/service_types'
import ClusterTypes from '#enums/cluster_types'
import ClusterHealthStatus from '#enums/cluster_health_status'
import RegionCodes from '#enums/region_codes'
import env from '#start/env'

const createManager = (name: string, hostnamePrefix: string, serviceType: ServiceTypes) => ({
  name,
  regionCode: RegionCodes.STAGING,
  hostnamePrefix,
  clusterType: ClusterTypes.SHARED,
  serviceType,
  dockerHostUrl: env.get('DOCKER_SWARM_MANAGER_HOST_URL'),
  isActive: true,
  healthStatus: ClusterHealthStatus.HEALTHY,
  ca: env.get('DOCKER_SWARM_MANAGER_CA'),
  cert: env.get('DOCKER_SWARM_MANAGER_CERT'),
  key: env.get('DOCKER_SWARM_MANAGER_KEY'),
})
export default class extends BaseSeeder {
  async run() {
    // Create MongoDB shared clusters for staging/development
    const mongodbManager = createManager(
      'mongodb-shared-staging-1',
      'mongodb',
      ServiceTypes.MONGODB
    )
    await DockerSwarmManager.createMany([mongodbManager])
  }
}
