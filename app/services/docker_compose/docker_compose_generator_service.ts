import DatabaseConfigStrategy from '#services/docker_compose/database_configs/database_config_strategy'
import ExporterConfigStrategy from '#services/docker_compose/exporter_configs/exporter_config_strategy'
import DockerComposeFileManager from '#services/docker_compose/helpers/docker_compose_file_manager'
import TemplateRendererService from '#services/template_renderer_service'
import { inject } from '@adonisjs/core'
import {
  DatabaseGenerationParams,
  DockerComposeFileResult,
  DockerComposeFileParams,
  ExporterGenerationParams,
  ExporterTemplateData,
  TemplateData,
} from '#services/docker_compose/types/docker_compose_types'
import { Logger } from '@adonisjs/core/logger'

interface RenderAndSaveTemplateParams {
  templatePath: string
  templateData: TemplateData | ExporterTemplateData
  templateType: 'database' | 'exporter'
  fileParams: DockerComposeFileParams
}

@inject()
export default class DockerComposeGeneratorService {
  constructor(
    protected templateRendererService: TemplateRendererService,
    protected fileManager: DockerComposeFileManager,
    protected databaseConfigStrategy: DatabaseConfigStrategy,
    protected exporterConfigStrategy: ExporterConfigStrategy,
    protected logger: Logger
  ) {}

  async generateDatabase(params: DatabaseGenerationParams): Promise<DockerComposeFileResult> {
    const dbConfig = this.databaseConfigStrategy.getDbConfig(
      params.databaseType,
      params.deploymentType
    )
    const templateData = dbConfig.buildTemplateData(params)

    return this.renderAndSaveTemplate({
      templatePath: dbConfig.getTemplatePath(),
      templateData,
      templateType: 'database',
      fileParams: {
        databaseType: params.databaseType,
        deploymentType: params.deploymentType,
      },
    })
  }

  async generateExporter(params: ExporterGenerationParams): Promise<DockerComposeFileResult> {
    const exporterConfig = this.exporterConfigStrategy.getExporterConfig(params.databaseType)
    const templateData = await exporterConfig.buildTemplateData(params)

    return this.renderAndSaveTemplate({
      templatePath: exporterConfig.getTemplatePath(),
      templateData,
      templateType: 'exporter',
      fileParams: {
        databaseType: params.databaseType,
        deploymentType: params.deploymentType,
      },
    })
  }

  /**
   * Render template and save to file with consistent logging.
   */
  private async renderAndSaveTemplate({
    fileParams,
    templateData,
    templatePath,
    templateType,
  }: RenderAndSaveTemplateParams): Promise<DockerComposeFileResult> {
    this.logger.info(`Rendering ${templateType} template...`)

    const content = await this.templateRendererService.renderTemplate(templatePath, templateData)

    this.logger.info(`${templateType} template rendered sucessfully`)

    const { fileName, filePath } = await this.fileManager.saveToFile(
      content,
      fileParams,
      templateType
    )

    this.logger.info(`${templateType} template saved to file`)

    return { fileName, content, filePath }
  }
}
