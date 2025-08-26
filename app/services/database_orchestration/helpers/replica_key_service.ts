import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DockerSecretService from '#services/docker_cli/docker_secret_service'
import { DockerParams } from '#services/database_orchestration/types/deployment_types'

@inject()
export default class ReplicaKeyService {
  constructor(
    private logger: Logger,
    private dockerSecretService: DockerSecretService
  ) {}

  async setupReplicaKeyIfNeeded(params: DockerParams & { isReplicaSet: boolean }): Promise<void> {
    if (params.isReplicaSet) {
      await this.createReplicaKeySecret(params)
    }
  }

  private async createReplicaKeySecret(params: DockerParams): Promise<void> {
    this.logger.info('Creating replica key secret for replica set deployment')

    const replicaKeySecretName = this.buildReplicaKeySecretName(params.databaseInstance.stackName)

    if (!params.passwords.replicaKey) {
      throw new Error('Replica key is required for replica set deployment')
    }

    this.logger.debug(`Creating replica key secret: ${replicaKeySecretName}`)
    await this.dockerSecretService.createSecret(
      params.infrastructure.primaryWorker.dockerSwarmManager,
      replicaKeySecretName,
      params.passwords.replicaKey
    )
    this.logger.info('Replica key secret created successfully')
  }

  buildReplicaKeySecretName(stackName: string): string {
    const baseName = `${stackName}_replicakey`

    // Docker secret names must be max 64 chars and contain only [a-zA-Z0-9-_.]
    if (baseName.length <= 64) {
      return baseName
    }

    // If too long, truncate stackName to fit within 64 char limit
    const suffix = '_replicakey'
    const maxStackNameLength = 64 - suffix.length
    const truncatedStackName = stackName.substring(0, maxStackNameLength)

    return `${truncatedStackName}${suffix}`
  }
}
