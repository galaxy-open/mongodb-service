import {
  DatabaseCertificateConfig,
  DatabaseCertificateFiles,
  DatabaseCertificateGenerationParams,
  OpenSSLCommands,
} from '#services/database_certificates/types/database_certificate_types'

export abstract class BaseCertificateConfig {
  abstract buildCertificateParams(
    params: DatabaseCertificateGenerationParams
  ): DatabaseCertificateConfig
  abstract buildCommands(
    files: DatabaseCertificateFiles,
    cn: string,
    config: DatabaseCertificateConfig
  ): OpenSSLCommands
}
