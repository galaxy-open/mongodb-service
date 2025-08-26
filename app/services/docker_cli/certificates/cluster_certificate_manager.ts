import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DockerSwarmManager from '#models/docker_swarm_manager'
import drive from '@adonisjs/drive/services/main'
import app from '@adonisjs/core/services/app'
import { join } from 'node:path'
import { ClusterCertificateFiles } from '#services/docker_cli/types/docker_cli_types'

@inject()
export default class ClusterCertificateManager {
  constructor(protected logger: Logger) {}

  /**
   * Create temporary certificate files for Docker commands
   * Returns paths to the created files and temp directory
   */
  public async createTempCertificateFiles(
    cluster: DockerSwarmManager
  ): Promise<ClusterCertificateFiles | null> {
    if (!cluster.cert && !cluster.ca) {
      return null
    }

    const basePath = `${cluster.name}_cluster_certs_${Date.now()}`
    const disk = drive.use('fs')
    const certPath = `${basePath}/cert.pem`
    const keyPath = `${basePath}/key.pem`
    const caCertPath = `${basePath}/ca.pem`

    try {
      if (cluster.cert) {
        await disk.put(certPath, cluster.cert)
      }

      if (cluster.key) {
        await disk.put(keyPath, cluster.key)
      }

      if (cluster.ca) {
        await disk.put(caCertPath, cluster.ca)
      }

      return {
        certPath,
        keyPath,
        caCertPath,
        basePath,
      }
    } catch (error) {
      this.logger.error(
        {
          clusterId: cluster.id,
          basePath,
          error: error.message,
          stack: error.stack,
        },
        'Failed to create temporary certificate files'
      )

      // Clean up on failure
      await this.cleanupTempCertificateFiles(basePath)
      throw error
    }
  }

  /**
   * Clean up temporary certificate files
   */
  public async cleanupTempCertificateFiles(basePath: string): Promise<void> {
    try {
      const disk = drive.use('fs')

      await disk.deleteAll(basePath)

      this.logger.debug({ basePath }, 'Cleaned up tmp docker certificate files')
    } catch (error) {
      this.logger.error(
        {
          basePath,
          error: error.message,
        },
        'Failed to cleanup tmp docker certificate files'
      )
    }
  }

  /**
   * Get Docker environment variables for TLS connection
   */
  public getDockerTlsEnv(
    cluster: DockerSwarmManager,
    certificateFiles?: ClusterCertificateFiles
  ): Record<string, string> {
    const env: Record<string, string> = {
      DOCKER_HOST: cluster.dockerHostUrl,
    }

    if (certificateFiles) {
      env.DOCKER_TLS_VERIFY = '1'
      env.DOCKER_CERT_PATH = join(app.tmpPath(), certificateFiles.basePath)
    }

    return env
  }
}
