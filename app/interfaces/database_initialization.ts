import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'
import TLSModes from '#enums/tls_modes'
import DockerSwarmManager from '#models/docker_swarm_manager'

/**
 * Base interface for Database initialization parameters.
 * Contains common parameters shared across all deployment types.
 */
export interface BaseDatabaseInitializationParams {
  hostnames: string[]
  port: number
  connectionUri: string
  adminPassword: string
  monitorPassword: string
  backupPassword: string
  databaseInstanceId: string
  tlsMode: TLSModes
}

/**
 * Parameters for standalone Database initialization.
 * Extends base parameters without additional fields.
 */
export interface InitializeStandaloneDatabaseParams extends BaseDatabaseInitializationParams {}

/**
 * Parameters for replica set Database initialization.
 * Extends base parameters with replica set specific configuration.
 */
export interface InitializeReplicaSetParams extends BaseDatabaseInitializationParams {
  replicaSetName: string
}

/**
 * Unified initialization parameters with discriminated union.
 * Combines all deployment types into a single interface.
 */
export interface InitializationParams extends BaseDatabaseInitializationParams {
  deploymentType: DeploymentTypes
  stackName: string
  replicaSetName?: string // Optional for replica sets
  cluster: DockerSwarmManager
  databaseEngine: DatabaseEngines
}

export interface InitializationResult {
  connectionUri: string
  users: DatabaseUser[]
  status: 'initialized' | 'failed'
  error?: string
}

export interface DatabaseUser {
  username: string
  roles: string[]
}

export interface DatabaseUserSpec {
  username: string
  password: string
  roles: DatabaseRole[]
  permissions?: string[]
}

export interface DatabaseRole {
  role: string
  db: string
}
