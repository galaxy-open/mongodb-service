import { inject } from '@adonisjs/core'
import ExporterTypes from '#enums/exporter_types'

import BaseExporterConfig from '#services/docker_compose/exporter_configs/base_exporter_config'
import DatabaseConnectionBuilderService from '#services/database_connection_builder/database_connection_builder_service'
import {
  ExporterGenerationParams,
  ExporterTemplateData,
} from '#services/docker_compose/types/docker_compose_types'
import FluentdHelper from '#services/docker_compose/helpers/fluentd_helper'

@inject()
export default class MongoDBExporterConfig extends BaseExporterConfig {
  constructor(
    private databaseConnectionBuilder: DatabaseConnectionBuilderService,
    private fluentdHelper: FluentdHelper
  ) {
    super()
  }
  async buildTemplateData(params: ExporterGenerationParams): Promise<ExporterTemplateData> {
    const mongodbURI = await this.buildExporterURI(params)

    return {
      fluentdAddress: this.fluentdHelper.buildURL(params.databaseType),
      stackName: params.stackName,
      port: params.port,
      monitorPassword: params.monitorPassword,
      exporterType: params.exporterType,
      databaseURI: mongodbURI,
      region: params.region,
      databaseWorkerNodeName: params.databaseWorkerNode.name,
      exporterPort: params.port - 10000,
      profilerPort: params.port - 5000,
    }
  }

  getTemplatePath(): string {
    return 'docker-compose/mongodb/exporter'
  }

  async buildExporterURI(params: ExporterGenerationParams): Promise<string> {
    const isReplica = params.exporterType === ExporterTypes.REPLICASET

    return this.databaseConnectionBuilder.buildMonitorConnection(params.databaseType, {
      hostnameUri: params.hostnameUri,
      password: params.monitorPassword,
      isReplica,
      tlsMode: params.tlsMode,
    })
  }
}
