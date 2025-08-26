import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import {
  DatabaseCertificateGenerationParams,
  DatabaseCertificateResult,
  OpenSSLCommands,
} from '#services/database_certificates/types/database_certificate_types'
import WorkerNodeCNResolver from '#services/database_certificates/helpers/worker_node_cn_resolver'
import CertificateConfigStrategy from '#services/database_certificates/configs/certificate_config_strategy'
import DatabaseCertificateFileManager from '#services/database_certificates/helpers/database_certificate_file_manager'

const execAsync = promisify(exec)

@inject()
export default class DatabaseCertificateGeneratorService {
  constructor(
    protected logger: Logger,
    protected cnResolver: WorkerNodeCNResolver,
    protected fileManager: DatabaseCertificateFileManager,
    protected certificateConfigStrategy: CertificateConfigStrategy
  ) {}

  async generate(params: DatabaseCertificateGenerationParams): Promise<DatabaseCertificateResult> {
    this.logger.info('Starting certificate generation')

    try {
      const dbConfig = this.certificateConfigStrategy.getDbConfig(params.databaseEngine)
      const cn = await this.cnResolver.resolveCN(params.cluster.hostnamePrefix)
      const config = dbConfig.buildCertificateParams(params)
      const certificateFiles = this.fileManager.buildFilePaths(params)
      const commands = dbConfig.buildCommands(certificateFiles, cn, config)
      await this.executeGenerationFlow(commands, params)

      this.logger.info('Certificate generation completed successfully')

      return {
        files: Object.values(certificateFiles),
        certificateFiles,
        commonName: cn,
      }
    } catch (error) {
      this.logger.error(
        {
          stackName: params.stackName,
          databaseEngine: params.databaseEngine,
          error: error.message,
        },
        'Certificate generation failed'
      )
      throw new Error(`Certificate generation failed: ${error.message}`)
    }
  }

  private async executeGenerationFlow(
    commands: OpenSSLCommands,
    params: DatabaseCertificateGenerationParams
  ): Promise<void> {
    try {
      await this.fileManager.ensureBaseDirectoryExists(params)

      // Phase 1: Run CA and CSR generation in parallel
      // These operations are independent:
      // - CA generates a self-signed certificate (doesn't need CSR)
      // - CSR generates its own key pair (doesn't need CA)
      // They only come together in Phase 2 when signing the certificate
      await Promise.all([
        this.executeCommand(commands.generateCA, 'Generating CA certificate'),
        this.executeCommand(commands.generateCSR, 'Generating CSR'),
      ])

      // Phase 2: Generate certificate (needs both CA and CSR)
      await this.executeCommand(commands.generateCert, 'Generating certificate')

      // Phase 3: Create final PEM (needs certificate and CSR key)
      await this.executeCommand(commands.createFinalPem, 'Creating final PEM file')
    } catch (error) {
      this.logger.error(
        {
          stackName: params.stackName,
          error: error.message,
        },
        'Certificate generation flow failed'
      )
      throw new Error(`Certificate generation flow failed: ${error.message}`)
    }
  }

  private async executeCommand(command: string, description: string): Promise<void> {
    this.logger.debug(`Executing: ${description}`, { command })

    try {
      await execAsync(command)
      this.logger.debug(`Successfully executed: ${description}`)
    } catch (error) {
      this.logger.error(`Command execution failed: ${description}`, {
        command,
        error: error.message,
      })
      throw new Error(`Command execution failed: ${description} - ${error.message}`)
    }
  }
}
