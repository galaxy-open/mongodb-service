import { inject } from '@adonisjs/core'
import TLSModes from '#enums/tls_modes'
import DatabaseVersions from '#enums/database_versions'
import ReplicaKeyService from '#services/database_orchestration/helpers/replica_key_service'
import {
  DatabaseGenerationParams,
  SecretsConfig,
} from '#services/docker_compose/types/docker_compose_types'

/**
 * Helper service for MongoDB Docker Compose configuration.
 * Consolidates shared logic between standalone and replica set configs.
 */
@inject()
export default class MongoDBConfigHelper {
  constructor(private replicaKeyService: ReplicaKeyService) {}
  /**
   * Build MongoDB command with shared base configuration.
   */
  buildBaseCommand(params: DatabaseGenerationParams): string {
    const baseCmd = 'mongod --profile 1 --slowms 50 --bind_ip 0.0.0.0 --auth'

    // Add replica set specific keyFile if needed
    const replicaSetCmd = params.isReplicaSet
      ? `${baseCmd} --keyFile /run/secrets/${this.replicaKeyService.buildReplicaKeySecretName(params.stackName!)}`
      : baseCmd

    return this.addTLSOptions(replicaSetCmd, params)
  }

  /**
   * Add TLS/SSL options to MongoDB command based on version and TLS mode.
   */
  private addTLSOptions(baseCmd: string, params: DatabaseGenerationParams): string {
    if (params.tlsMode === TLSModes.OFF) {
      return baseCmd
    }

    // MongoDB 4.0.19 uses SSL options
    if (params.databaseVersion === DatabaseVersions.MONGODB_4_0_19) {
      return `${baseCmd} --sslMode preferSSL --sslPEMKeyFile /run/secrets/${params.tlsSecretName}`
    }

    // MongoDB 6.0.16, 7.0.15, 8.0.4 use allowTLS with CA file (matching Go implementation)
    const modernVersions = [
      DatabaseVersions.MONGODB_6_0_16,
      DatabaseVersions.MONGODB_7_0_15,
      DatabaseVersions.MONGODB_8_0_4,
    ]

    if (modernVersions.includes(params.databaseVersion)) {
      return `${baseCmd} --tlsMode allowTLS --tlsCertificateKeyFile /run/secrets/${params.tlsSecretName} --tlsCAFile=/run/secrets/${params.caSecretName} --tlsAllowConnectionsWithoutCertificates`
    }

    // Default for other versions
    return `${baseCmd} --tlsMode preferTLS --tlsCertificateKeyFile /run/secrets/${params.tlsSecretName}`
  }

  /**
   * Build secrets configuration for both standalone and replica set.
   */
  buildSecretsConfig(params: DatabaseGenerationParams): SecretsConfig {
    const tlsEnabled = params.tlsMode === TLSModes.ON
    const needsCAFile = [
      DatabaseVersions.MONGODB_6_0_16,
      DatabaseVersions.MONGODB_7_0_15,
      DatabaseVersions.MONGODB_8_0_4,
    ].includes(params.databaseVersion)

    if (!tlsEnabled) {
      return { secrets: [], secretsConfig: [] }
    }

    const secrets = [{ source: params.tlsSecretName, target: params.tlsSecretName }]
    const secretsConfig = [{ name: params.tlsSecretName }]

    if (needsCAFile) {
      secrets.push({ source: params.caSecretName, target: params.caSecretName })
      secretsConfig.push({ name: params.caSecretName })
    }

    return { secrets, secretsConfig }
  }
}
