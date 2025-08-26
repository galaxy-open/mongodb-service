import { inject } from '@adonisjs/core'
import { mkdir } from 'node:fs/promises'
import { relative } from 'node:path'
import {
  DatabaseCertificateGenerationParams,
  DatabaseCertificateFiles,
} from '#services/database_certificates/types/database_certificate_types'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'

const DEFAULT_CERT_PERMS = 0o755

@inject()
export default class DatabaseCertificateFileManager {
  buildFilePaths(params: DatabaseCertificateGenerationParams): DatabaseCertificateFiles {
    const baseDir = this.getBaseDir(params)
    const fileName = this.getFileName(params)

    return {
      caKey: `${baseDir}/ca_${fileName}.key`,
      caCert: `${baseDir}/ca_${fileName}.pem`,
      csrKey: `${baseDir}/${fileName}.key`,
      csr: `${baseDir}/${fileName}.csr`,
      crt: `${baseDir}/${fileName}.crt`,
      finalPem: `${baseDir}/${fileName}_final.pem`,
    }
  }

  private getBaseDir(params: DatabaseCertificateGenerationParams): string {
    return `${app.tmpPath('certificates')}/${params.databaseEngine}/${params.deploymentType}`
  }

  private getFileName(params: DatabaseCertificateGenerationParams): string {
    return params.stackName
  }

  async ensureBaseDirectoryExists(params: DatabaseCertificateGenerationParams): Promise<void> {
    const baseDir = this.getBaseDir(params)
    await mkdir(baseDir, { recursive: true, mode: DEFAULT_CERT_PERMS })
  }

  async readCertificateFile(filePath: string): Promise<string> {
    const fsDisk = drive.use('fs')
    // Convert absolute path to relative path for fs disk
    const relativePath = relative(app.tmpPath(), filePath)
    return fsDisk.get(relativePath)
  }
}
