import DockerSwarmWorker from '#models/docker_swarm_worker'
import DatabaseInstance from '#models/database_instance'
import ExporterTypes from '#enums/exporter_types'
import ServiceTypes from '#enums/service_types'
import DeploymentTypes from '#enums/deployment_types'
import RegionCodes from '#enums/region_codes'
import TLSModes from '#enums/tls_modes'
import DatabaseEngines from '#enums/database_engines'
import { DateTime } from 'luxon'

export interface InfrastructureResult {
  deploymentType: DeploymentTypes
  primaryWorker: DockerSwarmWorker
  allWorkers: DockerSwarmWorker[]
  port: number
  hostnames: string[]
  connectionUri: string
}

export interface DeploymentParams {
  databaseInstanceId: string
  exporterType: ExporterTypes
  serviceType: ServiceTypes
  deploymentType: DeploymentTypes
}

export interface SecurityResult {
  tlsSecretName?: string
  caSecretName?: string
  certLabel?: string
}

export interface PasswordsResult {
  adminPassword: string
  monitorPassword: string
  backupPassword: string
  replicaKey?: string
}

export interface DockerDeploymentResult {
  dockerComposeContent: string
  exporterComposeContent: string
}

// Parameters for strategy methods
export interface DeploymentContext {
  databaseInstance: DatabaseInstance
  infrastructure: InfrastructureResult
  security: SecurityResult
  passwords: PasswordsResult
  params: DeploymentParams
}

// DNS creation parameters
export interface DnsParams {
  stackName: string
  regionCode: RegionCodes
  databaseEngine: DatabaseEngines
  serviceType: ServiceTypes
  ownerId: string
  infrastructure: InfrastructureResult
}

// Docker deployment parameters
export interface DockerParams {
  databaseInstance: DatabaseInstance
  infrastructure: InfrastructureResult
  passwords: PasswordsResult
  security: SecurityResult
  exporterType: ExporterTypes
}

// Metadata persistence parameters
export interface MetadataParams {
  databaseInstanceId: string
  infrastructure: InfrastructureResult
  passwords: PasswordsResult
  dockerDeployment: DockerDeploymentResult
  regionCode: RegionCodes
  tlsMode: TLSModes
  clusterId: string
  deploymentStartedAt: DateTime
  deploymentDurationMs: number
  databaseEngine: DatabaseEngines
  deploymentType: DeploymentTypes
}
