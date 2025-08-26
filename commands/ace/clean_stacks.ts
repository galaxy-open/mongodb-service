import ServiceTypes from '#enums/service_types'
import DockerSwarmManagerRepository from '#repositories/docker_swarm_manager_repository'
import DockerCliService from '#services/docker_cli/docker_cli_service'
import DeploymentCleanupService from '#services/database_orchestration/helpers/deployment_cleanup_service'
import { StackInfo } from '#services/docker_cli/types/docker_cli_types'
import { inject } from '@adonisjs/core'
import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class CleanStacks extends BaseCommand {
  static commandName = 'clean:stacks'
  static description = 'Clean Docker stacks containing a specific pattern in their name'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({
    description: 'Pattern to match in stack names',
    required: true,
  })
  declare pattern: string

  @flags.boolean({ description: 'dry run' })
  declare dryRun: boolean

  @flags.boolean({ description: 'also remove associated secrets', default: true })
  declare includeSecrets: boolean

  @inject()
  async run(
    dockerCliService: DockerCliService,
    dockerSwarmManagerRepo: DockerSwarmManagerRepository,
    deploymentCleanupService: DeploymentCleanupService
  ) {
    const searchPattern = this.pattern

    this.logger.info(`Searching for stacks containing: "${searchPattern}"`)

    const cluster = await dockerSwarmManagerRepo.findLeastLoadedSharedCluster(ServiceTypes.MONGODB)

    // Get all stacks
    const stacks = await dockerCliService.run(cluster, (docker) => docker.stackLs())
    console.log(stacks)

    // Filter stacks containing the pattern
    const matchingStacks = stacks.filter((stack: StackInfo) =>
      stack.Name.toLowerCase().includes(searchPattern.toLowerCase())
    )

    if (matchingStacks.length === 0) {
      this.logger.info(`No stacks found containing "${searchPattern}"`)
      return
    }

    this.logger.info(`Found ${matchingStacks.length} matching stacks:`)
    matchingStacks.forEach((stack: StackInfo) => {
      this.logger.info(`  - ${stack.Name} (${stack.Services} services)`)
    })

    if (this.includeSecrets) {
      this.logger.info('Will also attempt to remove associated secrets')
    }

    if (this.dryRun) {
      this.logger.info('DRY RUN MODE - No stacks or secrets will be removed')
      return
    }

    // Remove each stack and its associated resources
    for (const stack of matchingStacks) {
      try {
        this.logger.info(`Removing stack: ${stack.Name}`)

        // Use the cleanup service for thorough removal including secrets
        await deploymentCleanupService.cleanupStackManually(
          stack.Name,
          cluster,
          this.includeSecrets
        )

        this.logger.info(`✓ Successfully removed stack: ${stack.Name}`)
      } catch (error) {
        this.logger.error(`✗ Failed to remove stack ${stack.Name}: ${error.message}`)
      }
    }

    this.logger.info('Stack cleanup completed')
  }
}
