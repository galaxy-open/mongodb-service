import {
  ExporterGenerationParams,
  ExporterTemplateData,
} from '#services/docker_compose/types/docker_compose_types'

export default abstract class BaseExporterConfig {
  abstract buildTemplateData(params: ExporterGenerationParams): Promise<ExporterTemplateData>
  abstract getTemplatePath(): string
  abstract buildExporterURI(params: ExporterGenerationParams): Promise<string>
}
