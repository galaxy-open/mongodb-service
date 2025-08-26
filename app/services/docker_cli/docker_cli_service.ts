import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import DockerCommandBuilderService, {
  DockerCommand,
  ExecResult,
} from '#services/docker_cli/commands/docker_command_builder_service'
import DockerSwarmManager from '#models/docker_swarm_manager'
import ClusterCertificateManager from '#services/docker_cli/certificates/cluster_certificate_manager'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import DockerJsonParserService from '#services/docker_cli/commands/docker_json_parser_service'
import { ClusterCertificateFiles } from '#services/docker_cli/types/docker_cli_types'
import app from '@adonisjs/core/services/app'

const execAsync = promisify(exec)

/**
 * Cluster-aware Docker CLI service that handles execution with cluster-specific TLS connections
 */
@inject()
export default class DockerCliService {
  constructor(
    protected logger: Logger,
    protected certificateManager: ClusterCertificateManager,
    protected dockerCommandBuilderService: DockerCommandBuilderService,
    protected dockerJsonParserService: DockerJsonParserService
  ) {}

  /**
   * Execute Docker operation on a cluster with automatic TLS setup
   */
  async run<T>(
    cluster: DockerSwarmManager,
    operation: (
      dockerCli: DockerCommandBuilderService
    ) => DockerCommand<T> | Promise<DockerCommand<T>>
  ): Promise<T> {
    const certificateFiles = await this.setupCertificateFiles(cluster)
    const env = this.certificateManager.getDockerTlsEnv(cluster, certificateFiles)
    const dockerCommand = await operation(this.dockerCommandBuilderService)

    try {
      const execResult = await this.executeDockerCommand(dockerCommand, env)
      const result = this.parseResult(dockerCommand, execResult)

      return result
    } catch (error) {
      this.logger.error(
        {
          clusterId: cluster.id,
          command: dockerCommand.command,
          error: error.message,
          certificateFiles: certificateFiles
            ? {
                basePath: certificateFiles.basePath,
                fullPath: join(app.tmpPath(), certificateFiles.basePath),
              }
            : null,
        },
        'Docker operation failed'
      )
      throw error
    } finally {
      // Schedule cleanup with delay to ensure Docker has finished reading files
      if (certificateFiles) {
        setTimeout(async () => {
          try {
            await this.certificateManager.cleanupTempCertificateFiles(certificateFiles.basePath)
          } catch (err) {
            this.logger.warn('Certificate cleanup failed', {
              basePath: certificateFiles.basePath,
              error: err.message,
            })
          }
        }, 1000) // 1 second delay
      }
    }
  }

  /**
   * Execute Docker command with environment - returns raw ExecResult
   */
  private async executeDockerCommand(
    command: DockerCommand,
    env: Record<string, string>
  ): Promise<ExecResult> {
    try {
      const { command: cmd, args, stdin } = command

      const escapedStdin = stdin?.replace(/'/g, "'\\''")
      const fullCommandStdin = `echo '${escapedStdin}' | docker ${cmd} ${args.join(' ')}`
      const fullCommand = cmd ? `docker ${cmd} ${args.join(' ')}` : `docker ${args.join(' ')}`
      const execCommand = stdin ? fullCommandStdin : fullCommand

      const { stdout, stderr } = await execAsync(execCommand, { env })
      return { stdout, stderr }
    } catch (error) {
      const commandPart = command.command ? `${command.command} ` : ''
      throw new Error(
        `Docker command failed: ${commandPart}${command.args.join(' ')} - ${error.message}`
      )
    }
  }

  /**
   * Parse command result based on output type metadata
   */
  private parseResult<T>(command: DockerCommand<T>, result: ExecResult): T {
    try {
      switch (command.outputType) {
        case 'json_array':
          return this.dockerJsonParserService.parseAsArray(result.stdout) as T

        case 'json_single':
          const parsed = this.dockerJsonParserService.parse(result.stdout)
          return (Array.isArray(parsed) ? parsed[0] : parsed) as T

        default:
          return result as T
      }
    } catch (error) {
      throw new Error(
        `Failed to parse ${command.outputType} output for ${command.command} ${command.args.join(' ')}: ${error.message}`
      )
    }
  }

  private async setupCertificateFiles(
    cluster: DockerSwarmManager
  ): Promise<ClusterCertificateFiles> {
    const certificateFiles = await this.certificateManager.createTempCertificateFiles(cluster)
    if (!certificateFiles) {
      throw new Error('Failed to create temporary certificate files')
    }
    return certificateFiles
  }
}
