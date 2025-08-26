import { inject } from '@adonisjs/core'
import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'
import env from '#start/env'
import ConnectionBuilderFactory from './connection_builder_factory.js'
import { UserConnectionParameters, HostnameService } from '#interfaces/database_connection_builder'
import { InitializationParams } from '#interfaces/database_initialization'

/**
 * Centralized service for all database connection building operations.
 * Uses strategy pattern to handle database-specific connection logic.
 */
@inject()
export default class DatabaseConnectionBuilderService implements HostnameService {
  constructor(private connectionBuilderFactory: ConnectionBuilderFactory) {}

  /**
   * Build general initialization connection URI
   */
  buildInitializationConnection(
    databaseEngine: DatabaseEngines,
    params: InitializationParams,
    deploymentType: DeploymentTypes
  ): string {
    const strategy = this.connectionBuilderFactory.getStrategy(databaseEngine)
    return strategy.buildInitializationConnection(params, deploymentType)
  }

  /**
   * Build direct connection URI (for replica set initialization)
   */
  buildDirectConnection(
    databaseEngine: DatabaseEngines,
    hostnameUri: string,
    adminPassword: string
  ): string {
    const strategy = this.connectionBuilderFactory.getStrategy(databaseEngine)
    return strategy.buildDirectConnection(hostnameUri, adminPassword)
  }

  /**
   * Build admin user connection
   */
  buildAdminConnection(databaseEngine: DatabaseEngines, params: UserConnectionParameters): string {
    const strategy = this.connectionBuilderFactory.getStrategy(databaseEngine)
    return strategy.buildAdminConnection(params)
  }

  /**
   * Build monitor user connection
   */
  buildMonitorConnection(
    databaseEngine: DatabaseEngines,
    params: UserConnectionParameters
  ): string {
    const strategy = this.connectionBuilderFactory.getStrategy(databaseEngine)
    return strategy.buildMonitorConnection(params)
  }

  /**
   * Build backup user connection
   */
  buildBackupConnection(databaseEngine: DatabaseEngines, params: UserConnectionParameters): string {
    const strategy = this.connectionBuilderFactory.getStrategy(databaseEngine)
    return strategy.buildBackupConnection(params)
  }

  /**
   * Generate database hostname
   */
  async generateDatabaseHostname(
    stackName: string,
    workerNumber: number,
    hostnamePrefix: string
  ): Promise<string> {
    const baseDomain = env.get('BASE_DOMAIN')
    const environment = env.get('ENVIRONMENT')

    return `${stackName}-${workerNumber}.${hostnamePrefix}.${environment}.${baseDomain}`
  }

  /**
   * Generate hostname URI with port
   */
  async generateHostnameUri(hostname: string, port: number): Promise<string> {
    return `${hostname}:${port}`
  }

  /**
   * Generate replica set connection URI with all members and replica set parameter.
   * Format: host1:port,host2:port,host3:port/?replicaSet=stackName
   */
  async generateReplicaSetUri(
    hostnames: string[],
    port: number,
    replicaSetName: string
  ): Promise<string> {
    // Build host:port pairs for all members
    const hostPairs = hostnames.map((hostname) => `${hostname}:${port}`)

    // Join with comma and add replica set parameter
    return `${hostPairs.join(',')}/?replicaSet=${replicaSetName}`
  }
}
