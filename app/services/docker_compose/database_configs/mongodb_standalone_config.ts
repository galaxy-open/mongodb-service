import { inject } from '@adonisjs/core'
import TLSModes from '#enums/tls_modes'
import BaseDatabaseConfig from '#services/docker_compose/database_configs/base_database_config'
import MongoDBConfigHelper from '#services/docker_compose/helpers/mongodb_config_helper'
import FluentdHelper from '#services/docker_compose/helpers/fluentd_helper'
import {
  DatabaseGenerationParams,
  SecretsConfig,
  TemplateData,
} from '#services/docker_compose/types/docker_compose_types'

@inject()
export default class MongoDBStandaloneConfig extends BaseDatabaseConfig {
  constructor(
    private mongodbConfigHelper: MongoDBConfigHelper,
    private fluentdHelper: FluentdHelper
  ) {
    super()
  }
  buildCommand(params: DatabaseGenerationParams): string {
    return this.mongodbConfigHelper.buildBaseCommand(params)
  }

  buildSecrets(params: DatabaseGenerationParams): SecretsConfig {
    return this.mongodbConfigHelper.buildSecretsConfig(params)
  }

  buildTemplateData(params: DatabaseGenerationParams): TemplateData {
    const tlsEnabled = params.tlsMode === TLSModes.ON
    const { secrets, secretsConfig } = this.buildSecrets(params)

    return {
      ...params,
      fluentdAddress: this.fluentdHelper.buildURL(params.databaseType),
      command: this.buildCommand(params),
      tlsEnabled,
      secrets,
      secretsConfig,
      workerNumber: params.databaseWorkerNodes[0].workerNumber,
    }
  }

  getTemplatePath(): string {
    return 'docker-compose/mongodb/standalone'
  }
}
