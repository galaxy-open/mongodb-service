import { BaseSeeder } from '@adonisjs/lucid/seeders'
import InstanceSize from '#models/instance_size'
import DeploymentTypes from '#enums/deployment_types'
import DatabaseEngines from '#enums/database_engines'
import DatabaseInstanceNames from '#enums/database_instance_names'

const mongoDBInstanceSizesReplicaset = [
  {
    name: DatabaseInstanceNames.BASIC,
    displayName: 'Basic',
    cpuCores: 0.5,
    cpuResources: '0.170',
    memoryMb: 512,
    diskGb: 5,
    priceMonthlyCents: 2400,
  },
  {
    name: DatabaseInstanceNames.STARTER,
    displayName: 'Starter',
    cpuCores: 1,
    memoryMb: 1024,
    cpuResources: '0.340',
    diskGb: 10,
    priceMonthlyCents: 3600,
  },
  {
    name: DatabaseInstanceNames.STANDARD,
    displayName: 'Standard',
    cpuCores: 2,
    memoryMb: 2048,
    cpuResources: '0.680',
    diskGb: 15,
    priceMonthlyCents: 5400,
  },
  {
    name: DatabaseInstanceNames.PRO,
    displayName: 'Pro',
    cpuCores: 4,
    memoryMb: 4096,
    cpuResources: '1.360',
    diskGb: 30,
    priceMonthlyCents: 13200,
  },
  {
    name: DatabaseInstanceNames.PREMIUM,
    displayName: 'Premium',
    cpuCores: 4,
    memoryMb: 8192,
    cpuResources: '1.360',
    diskGb: 60,
    priceMonthlyCents: 36900,
  },
  {
    name: DatabaseInstanceNames.PLUS,
    displayName: 'Plus',
    cpuCores: 6,
    memoryMb: 16384,
    cpuResources: '2.040',
    diskGb: 100,
    priceMonthlyCents: 71100,
  },
  {
    name: DatabaseInstanceNames.ULTRA,
    displayName: 'Ultra',
    cpuCores: 12,
    memoryMb: 32768,
    cpuResources: '4.080',
    diskGb: 180,
    priceMonthlyCents: 136800,
  },
]

const mongoDBInstanceSizesStandalone = [
  {
    name: DatabaseInstanceNames.BASIC,
    displayName: 'Basic',
    cpuCores: 0.5,
    cpuResources: '0.170',
    memoryMb: 512,
    diskGb: 5,
    priceMonthlyCents: 800,
  },
  {
    name: DatabaseInstanceNames.STARTER,
    displayName: 'Starter',
    cpuCores: 1,
    memoryMb: 1024,
    cpuResources: '0.340',
    diskGb: 10,
    priceMonthlyCents: 1200,
  },

  {
    name: DatabaseInstanceNames.STANDARD,
    displayName: 'Standard',
    cpuCores: 2,
    memoryMb: 2048,
    cpuResources: '0.680',
    diskGb: 15,
    priceMonthlyCents: 1800,
  },

  {
    name: DatabaseInstanceNames.PRO,
    displayName: 'Pro',
    cpuCores: 4,
    memoryMb: 4096,
    cpuResources: '1.360',
    diskGb: 30,
    priceMonthlyCents: 4400,
  },
  {
    name: DatabaseInstanceNames.PREMIUM,
    displayName: 'Premium',
    cpuCores: 4,
    memoryMb: 8192,
    cpuResources: '1.360',
    diskGb: 60,
    priceMonthlyCents: 12300,
  },
  {
    name: DatabaseInstanceNames.PLUS,
    displayName: 'Plus',
    cpuCores: 6,
    memoryMb: 16384,
    cpuResources: '2.040',
    diskGb: 100,
    priceMonthlyCents: 23700,
  },
  {
    name: DatabaseInstanceNames.ULTRA,
    displayName: 'Ultra',
    cpuCores: 12,
    memoryMb: 32768,
    cpuResources: '4.080',
    diskGb: 180,
    priceMonthlyCents: 45600,
  },
]

export default class extends BaseSeeder {
  async run() {
    // Create MongoDB Standalone instance sizes
    await InstanceSize.createMany(
      mongoDBInstanceSizesStandalone.map((instanceSize) => ({
        ...instanceSize,
        deploymentType: DeploymentTypes.STANDALONE,
        databaseEngine: DatabaseEngines.MONGODB,
      }))
    )

    // Create MongoDB ReplicaSet instance sizes
    await InstanceSize.createMany(
      mongoDBInstanceSizesReplicaset.map((instanceSize) => ({
        ...instanceSize,
        deploymentType: DeploymentTypes.REPLICASET,
        databaseEngine: DatabaseEngines.MONGODB,
      }))
    )
  }
}
