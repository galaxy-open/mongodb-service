import DatabaseCertificateGeneratorService from '#services/database_certificates/database_certificate_generator_service'
import DatabaseCertificateStorageService from '#services/database_certificate_storage_service'
import {
  DatabaseCertificateGenerationParams,
  DatabaseCertificateResult,
  DatabaseCertificateUploadResult,
} from '#services/database_certificates/types/database_certificate_types'
import { inject } from '@adonisjs/core'

export interface DatabaseCertificateServiceResult {
  certificates: DatabaseCertificateResult
  uploadResult: DatabaseCertificateUploadResult
}

@inject()
export default class DatabaseCertificatesService {
  constructor(
    private certificateGeneratorService: DatabaseCertificateGeneratorService,
    private certificateStorageService: DatabaseCertificateStorageService
  ) {}

  async generate(
    params: DatabaseCertificateGenerationParams
  ): Promise<DatabaseCertificateServiceResult> {
    const certificates = await this.certificateGeneratorService.generate(params)

    const uploadResult = await this.certificateStorageService.upload({
      stackName: params.stackName,
      files: certificates.files,
      databaseEngine: params.databaseEngine,
    })

    return {
      certificates,
      uploadResult,
    }
  }
}
