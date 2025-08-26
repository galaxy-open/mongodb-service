import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DeploymentTypes from '#enums/deployment_types'
import TLSModes from '#enums/tls_modes'
import { DatabaseConstants } from '#services/database_initialization/config/database_constants'
import {
  ConnectionBuilderStrategy,
  UserConnectionParameters,
} from '#interfaces/database_connection_builder'
import { InitializationParams } from '#interfaces/database_initialization'

@inject()
export default class MongoDBConnectionBuilderStrategy implements ConnectionBuilderStrategy {
  constructor(private logger: Logger) {}

  buildInitializationConnection(
    params: InitializationParams,
    deploymentType: DeploymentTypes
  ): string {
    switch (deploymentType) {
      case DeploymentTypes.STANDALONE:
        return this.buildStandaloneInitializationUri(params)
      case DeploymentTypes.REPLICASET:
        return this.buildReplicaSetInitializationUri(params)
      default:
        throw new Error(`Unsupported deployment type: ${deploymentType}`)
    }
  }

  buildDirectConnection(hostnameUri: string, adminPassword: string): string {
    const directConnectionUri = `${hostnameUri}/?directConnection=true`

    return this.buildAdminConnection({
      hostnameUri: directConnectionUri,
      password: adminPassword,
      isReplica: false,
      tlsMode: TLSModes.OFF, // Direct connections always use TLS OFF for initialization
    })
  }

  buildAdminConnection(params: UserConnectionParameters): string {
    return this.buildUserConnectionString(DatabaseConstants.DEFAULT_USERS.USER_ADMIN, params)
  }

  buildMonitorConnection(params: UserConnectionParameters): string {
    return this.buildUserConnectionString(DatabaseConstants.DEFAULT_USERS.MONITOR, params)
  }

  buildBackupConnection(params: UserConnectionParameters): string {
    return this.buildUserConnectionString(DatabaseConstants.DEFAULT_USERS.BACKUP, params)
  }

  buildDefaultUserConnection(params: UserConnectionParameters): string {
    return this.buildUserConnectionString(DatabaseConstants.DEFAULT_USERS.USER_ADMIN, params)
  }

  private buildStandaloneInitializationUri(params: InitializationParams): string {
    const hostnameUri = `${params.hostnames[0]}:${params.port}`

    this.logger.debug(
      { hostname: params.hostnames[0], port: params.port },
      'Building standalone MongoDB initialization URI'
    )

    return this.buildAdminConnection({
      hostnameUri,
      password: params.adminPassword,
      isReplica: false,
      tlsMode: params.tlsMode,
    })
  }

  private buildReplicaSetInitializationUri(params: InitializationParams): string {
    const hosts = params.hostnames.map((hostname) => `${hostname}:${params.port}`)
    const hostnameUri = `${hosts.join(',')}/?replicaSet=${params.replicaSetName}`

    this.logger.debug(
      { hostnames: params.hostnames, port: params.port, replicaSetName: params.replicaSetName },
      'Building replica set MongoDB initialization URI'
    )

    return this.buildAdminConnection({
      hostnameUri,
      password: params.adminPassword,
      isReplica: true,
      tlsMode: params.tlsMode,
    })
  }

  private buildUserConnectionString(
    username: string,
    { hostnameUri, password, tlsMode, isReplica = false }: UserConnectionParameters
  ): string {
    this.logger.debug({ hostnameUri, tlsMode, isReplica }, `Building ${username} connection string`)

    const baseUri = `mongodb://${username}:${password}@${hostnameUri}`

    if (tlsMode === TLSModes.OFF) {
      return baseUri
    }

    if (isReplica) {
      return `${baseUri}/?ssl=true&tlsInsecure=true`
    }

    return `${baseUri}/?ssl=true&tlsInsecure=true`
  }
}
