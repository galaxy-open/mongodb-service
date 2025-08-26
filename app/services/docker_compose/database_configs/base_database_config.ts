import {
  DatabaseGenerationParams,
  SecretsConfig,
  TemplateData,
} from '#services/docker_compose/types/docker_compose_types'

export default abstract class BaseDatabaseConfig {
  abstract buildCommand(params: DatabaseGenerationParams): string
  abstract buildSecrets(params: DatabaseGenerationParams): SecretsConfig
  abstract buildTemplateData(params: DatabaseGenerationParams): TemplateData
  abstract getTemplatePath(): string
}
