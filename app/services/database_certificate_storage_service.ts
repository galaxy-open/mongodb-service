import { inject } from '@adonisjs/core'
import drive from '@adonisjs/drive/services/main'
import { basename, relative } from 'node:path'
import { Logger } from '@adonisjs/core/logger'
import app from '@adonisjs/core/services/app'
import DatabaseInstance from '#models/database_instance'
import DatabaseEngines from '#enums/database_engines'
import {
  DatabaseCertificateUploadParams,
  DatabaseCertificateUploadResult,
} from '#services/database_certificates/types/database_certificate_types'

export interface CertificateDownloadResult {
  content: string | Buffer
  filename: string
  contentType: string
}

@inject()
export default class DatabaseCertificateStorageService {
  constructor(private logger: Logger) {}

  /**
   * Get S3 base path for certificates
   */
  public getS3BasePath(databaseEngine: DatabaseEngines, stackName: string): string {
    return `${databaseEngine}/${stackName}/certificates/`
  }

  /**
   * Upload certificate files to S3
   */
  async upload(params: DatabaseCertificateUploadParams): Promise<DatabaseCertificateUploadResult> {
    this.logger.info('Starting certificate upload to S3')

    try {
      const fsDisk = drive.use('fs') // Source (local files)
      const s3Disk = drive.use('s3') // Destination (S3)

      const s3BasePath = this.getS3BasePath(params.databaseEngine, params.stackName)

      const uploadPromises = params.files.map(async (localFilePath) => {
        const fileName = basename(localFilePath)
        const s3Path = `${s3BasePath}${fileName}`

        // Convert absolute path to relative path for fs disk
        // fs disk root is app.tmpPath(), so we need path relative to that
        const relativePath = relative(app.tmpPath(), localFilePath)

        const fileContent = await fsDisk.get(relativePath)
        await s3Disk.put(s3Path, fileContent)

        return s3Path
      })

      const uploadedFiles = await Promise.all(uploadPromises)

      this.logger.info('Certificate upload completed successfully')

      return {
        uploadedFiles,
        provider: 's3',
        basePath: s3BasePath,
      }
    } catch (error) {
      this.logger.error(
        {
          stackName: params.stackName,
          databaseEngine: params.databaseEngine,
          error: error.message,
        },
        'Certificate upload failed'
      )
      throw new Error(`Certificate upload failed: ${error.message}`)
    }
  }

  /**
   * Download certificate file for a database instance from S3
   */
  async downloadCertificate(database: DatabaseInstance): Promise<CertificateDownloadResult> {
    const certificateFilename = `${database.stackName}.crt`
    const s3BasePath = this.getS3BasePath(database.databaseEngine, database.stackName)
    const s3Path = `${s3BasePath}${certificateFilename}`

    try {
      const s3Disk = drive.use('s3')
      const certificateContent = await s3Disk.get(s3Path)

      this.logger.info(`Downloaded certificate for database ${database.id} from S3: ${s3Path}`)
      return {
        content: certificateContent,
        filename: `${database.name}.crt`,
        contentType: 'application/x-x509-ca-cert',
      }
    } catch (error) {
      throw new Error(`Certificate file not found: ${s3Path}`)
    }
  }
}
