import DeploymentTypes from '#enums/deployment_types'
import TLSModes from '#enums/tls_modes'
import { InitializationParams } from '#interfaces/database_initialization'

/**
 * Parameters for user-specific connections
 */
export interface UserConnectionParameters {
  hostnameUri: string
  password: string
  tlsMode: TLSModes
  isReplica: boolean
  database?: string
}

/**
 * Hostname generation parameters
 */
export interface HostnameGenerationParameters {
  stackName: string
  workerNumber: number
  hostnamePrefix: string
}

/**
 * Connection result with metadata
 */
export interface ConnectionResult {
  adminUri: string
  database: string
  hostname: string
  port: number
  tlsEnabled: boolean
  isReplica: boolean
}

/**
 * Connection builder strategy interface for database-specific implementations
 */
export interface ConnectionBuilderStrategy {
  /**
   * Build general initialization connection URI
   */
  buildInitializationConnection(
    params: InitializationParams,
    deploymentType: DeploymentTypes
  ): string

  /**
   * Build direct connection URI (for replica set initialization)
   */
  buildDirectConnection(hostnameUri: string, adminPassword: string): string

  /**
   * Build user-specific connection strings
   */
  buildAdminConnection(params: UserConnectionParameters): string
  buildMonitorConnection(params: UserConnectionParameters): string
  buildBackupConnection(params: UserConnectionParameters): string

  /**
   * Build connection for default database user
   */
  buildDefaultUserConnection(params: UserConnectionParameters): string
}

/**
 * Hostname service interface for generating hostnames and URIs
 */
export interface HostnameService {
  /**
   * Generate database hostname
   */
  generateDatabaseHostname(
    stackName: string,
    workerNumber: number,
    hostnamePrefix: string
  ): Promise<string>

  /**
   * Generate hostname URI with port
   */
  generateHostnameUri(hostname: string, port: number): Promise<string>

  /**
   * Generate replica set connection URI
   */
  generateReplicaSetUri(hostnames: string[], port: number, replicaSetName: string): Promise<string>
}
