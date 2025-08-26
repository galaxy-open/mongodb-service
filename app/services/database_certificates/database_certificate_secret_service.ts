import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DockerSecretService from '#services/docker_cli/docker_secret_service'
import TLSModes from '#enums/tls_modes'
import {
  DatabaseCertificateResult,
  DatabaseCertificateSecretCreationParams,
  DatabaseCertificateSecrets,
} from '#services/database_certificates/types/database_certificate_types'
import DatabaseVersions from '#enums/database_versions'
import DatabaseCertificateFileManager from '#services/database_certificates/helpers/database_certificate_file_manager'
import DockerSwarmManager from '#models/docker_swarm_manager'

@inject()
export default class DatabaseCertificateSecretService {
  constructor(
    protected logger: Logger,
    protected dockerSecretService: DockerSecretService,
    protected certificateFileManager: DatabaseCertificateFileManager
  ) {}

  async createSecrets(
    cluster: DockerSwarmManager,
    certificateResult: DatabaseCertificateResult,
    params: DatabaseCertificateSecretCreationParams
  ): Promise<DatabaseCertificateSecrets> {
    this.logger.info('Creating Docker secrets for certificates')

    if (params.tlsMode === TLSModes.OFF) {
      return {
        tlsSecretName: '',
        caSecretName: '',
        certLabel: '',
      }
    }

    try {
      const secretNames = this.generateSecretNames(params.stackName)
      const needsCaSecret = this.needsCaSecret(params.databaseVersion)

      const tlsContent = await this.certificateFileManager.readCertificateFile(
        certificateResult.certificateFiles.finalPem
      )
      const certContent = await this.certificateFileManager.readCertificateFile(
        certificateResult.certificateFiles.crt
      )

      await this.dockerSecretService.createSecret(cluster, secretNames.tlsSecretName, tlsContent)

      let caSecretName = ''
      if (needsCaSecret) {
        caSecretName = secretNames.caSecretName
        const caContent = await this.certificateFileManager.readCertificateFile(
          certificateResult.certificateFiles.caCert
        )
        await this.dockerSecretService.createSecret(cluster, caSecretName, caContent)
      }

      this.logger.info('Docker secrets created successfully')

      return {
        tlsSecretName: secretNames.tlsSecretName,
        caSecretName,
        certLabel: certContent,
      }
    } catch (error) {
      this.logger.error(
        {
          stackName: params.stackName,
          error: error.message,
        },
        'Failed to create Docker secrets for certificates'
      )
      throw new Error(`Failed to create Docker secrets for ${params.stackName}: ${error.message}`)
    }
  }

  async cleanupSecrets(cluster: DockerSwarmManager, stackName: string): Promise<void> {
    this.logger.info('Cleaning up Docker secrets')

    try {
      const secretNames = this.generateSecretNames(stackName)

      await this.removeSecretIfExists(cluster, secretNames.tlsSecretName)
      await this.removeSecretIfExists(cluster, secretNames.caSecretName)

      this.logger.info('Docker secrets cleaned up successfully')
    } catch (error) {
      this.logger.error(
        {
          stackName,
          error: error.message,
        },
        'Failed to cleanup Docker secrets'
      )
      throw new Error(`Failed to cleanup Docker secrets for ${stackName}: ${error.message}`)
    }
  }

  private generateSecretNames(stackName: string) {
    return {
      tlsSecretName: `${stackName}_tlscert`,
      caSecretName: `${stackName}_ca`,
    }
  }

  private needsCaSecret(databaseVersion: DatabaseVersions): boolean {
    return (
      databaseVersion === DatabaseVersions.MONGODB_7_0_4 ||
      databaseVersion === DatabaseVersions.MONGODB_8_0_4
    )
  }

  private async removeSecretIfExists(
    cluster: DockerSwarmManager,
    secretName: string
  ): Promise<void> {
    const secretExists = await this.dockerSecretService.secretExists(cluster, secretName)
    if (secretExists) {
      await this.dockerSecretService.removeSecret(cluster, secretName)
    }
  }
}
