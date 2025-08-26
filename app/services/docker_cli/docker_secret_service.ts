import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DockerCliService from '#services/docker_cli/docker_cli_service'
import DockerSwarmManager from '#models/docker_swarm_manager'

@inject()
export default class DockerSecretService {
  constructor(
    protected logger: Logger,
    protected dockerCliService: DockerCliService
  ) {}

  async createSecret(
    cluster: DockerSwarmManager,
    secretName: string,
    secretValue: string
  ): Promise<void> {
    this.logger.info({ secretName }, 'Creating Docker secret')

    try {
      const exists = await this.secretExists(cluster, secretName)
      if (exists) {
        this.logger.info({ secretName }, 'Docker secret already exists, skipping creation')
        return
      }

      await this.dockerCliService.run(cluster, (docker) =>
        docker.secretCreate(secretName, secretValue)
      )
      this.logger.info({ secretName }, 'Docker secret created successfully')
    } catch (error) {
      this.logger.error(
        {
          secretName,
          error: error.message,
        },
        'Failed to create Docker secret'
      )
      throw new Error(`Failed to create Docker secret ${secretName}: ${error.message}`)
    }
  }

  async removeSecret(cluster: DockerSwarmManager, secretName: string): Promise<void> {
    this.logger.info('Removing Docker secret')

    try {
      await this.dockerCliService.run(cluster, (docker) => docker.secretRm(secretName))
      this.logger.info('Docker secret removed successfully')
    } catch (error) {
      this.logger.error(
        {
          secretName,
          error: error.message,
        },
        'Failed to remove Docker secret'
      )
      throw new Error(`Failed to remove Docker secret ${secretName}: ${error.message}`)
    }
  }

  async secretExists(cluster: DockerSwarmManager, secretName: string): Promise<boolean> {
    try {
      const secrets = await this.dockerCliService.run(cluster, (docker) => docker.secretLs())
      return secrets.some((secret) => secret.Name === secretName)
    } catch (error) {
      this.logger.error(
        {
          secretName,
          error: error.message,
        },
        'Failed to check if Docker secret exists'
      )
      return false
    }
  }
}
