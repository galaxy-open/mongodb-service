import DatabaseVersions from '#enums/database_versions'
import TLSModes from '#enums/tls_modes'
import RegionCodes from '#enums/region_codes'
import DatabaseInstanceNames from '#enums/database_instance_names'
import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'
import ExporterTypes from '#enums/exporter_types'
import DockerSwarmWorker from '#models/docker_swarm_worker'

export interface DatabaseGenerationParams {
  databaseType: DatabaseEngines
  deploymentType: DeploymentTypes
  databaseVersion: DatabaseVersions
  tlsMode: TLSModes
  instanceSize: DatabaseInstanceNames
  adminPassword: string
  tlsSecretName: string
  caSecretName: string
  certLabel: string
  cpuResources: string
  memoryGb: string
  diskGb: string
  regionCode: RegionCodes
  databaseWorkerNodes: DockerSwarmWorker[] // Array of workers (single for standalone, multiple for replica set)
  port: number
  stackName: string // For replica set name
  isReplicaSet: boolean
}

export interface ExporterGenerationParams {
  stackName: string
  port: number
  monitorPassword: string
  databaseType: DatabaseEngines
  deploymentType: DeploymentTypes
  exporterType: ExporterTypes
  databaseWorkerNode: DockerSwarmWorker
  region: RegionCodes
  ownerId: string
  hostnameUri: string // Connection URI from infrastructure setup
  tlsMode: TLSModes
}

export interface ExporterTemplateData {
  stackName: string
  port?: number
  monitorPassword?: string
  exporterType: ExporterTypes
  databaseURI: string
  region?: RegionCodes
  databaseWorkerNodeName: string
  exporterPort: number
  profilerPort?: number
  fluentdAddress: string
}

export interface DockerComposeFileResult {
  fileName: string
  content: string
  filePath: string
}

export interface SecretsConfig {
  secrets: Array<{ source: string; target: string }>
  secretsConfig: Array<{ name: string }>
}

export interface TemplateData {
  [key: string]: any
  command: string
  fluentdAddress: string
  tlsEnabled: boolean
  secrets: SecretsConfig['secrets']
  secretsConfig: SecretsConfig['secretsConfig']
}

export interface DockerComposeFileParams {
  databaseType: DatabaseEngines
  deploymentType: DeploymentTypes
}
