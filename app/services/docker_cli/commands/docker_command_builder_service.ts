import { inject } from '@adonisjs/core'
import {
  ContainerInfo,
  ImageInfo,
  NetworkInfo,
  NodeInfo,
  SecretInfo,
  ServiceDetails,
  ServiceInfo,
  ServiceTask,
  StackInfo,
  VolumeInfo,
} from '#services/docker_cli/types/docker_cli_types'

export interface ExecResult {
  stdout: string
  stderr: string
}

// @ts-ignore
export interface DockerCommand<T = any> {
  command: string
  args: string[]
  stdin?: string
  outputType: 'json_array' | 'json_single' | 'raw_text'
}

/**
 * Pure Docker CLI command builder - no execution, only command construction
 */
@inject()
export default class DockerCommandBuilderService {
  private buildCommand<T>(
    command: string,
    args: string[],
    outputType: 'json_array' | 'json_single' | 'raw_text',
    stdin?: string
  ): DockerCommand<T> {
    return { command, args, stdin, outputType }
  }

  // Stack Commands
  stackLs(): DockerCommand<StackInfo[]> {
    const args = ['ls', '--format', 'json']
    return this.buildCommand('stack', args, 'json_array')
  }

  stackDeploy(
    composeFilePath: string,
    stackName: string,
    withRegistryAuth = false
  ): DockerCommand<ExecResult> {
    const args = ['deploy']
    if (withRegistryAuth) {
      args.push('--with-registry-auth')
    }
    args.push('-c', composeFilePath, stackName)
    return this.buildCommand('stack', args, 'raw_text')
  }

  stackRm(stackName: string): DockerCommand<ExecResult> {
    return this.buildCommand('stack', ['rm', stackName], 'raw_text')
  }

  stackServices(stackName: string): DockerCommand<ServiceInfo[]> {
    const args = ['services', stackName, '--format', 'json']
    return this.buildCommand('stack', args, 'json_array')
  }

  // Service Commands
  serviceLs(): DockerCommand<ServiceInfo[]> {
    const args = ['ls', '--format', 'json']
    return this.buildCommand('service', args, 'json_array')
  }

  serviceInspect(stackName: string): DockerCommand<ServiceDetails> {
    const args = ['inspect', stackName]
    return this.buildCommand('service', args, 'json_single')
  }

  servicePs(stackName: string, filters?: string[]): DockerCommand<ServiceTask[]> {
    const args = ['ps']

    if (filters) {
      filters.forEach((filter) => {
        args.push('--filter', filter)
      })
    }

    args.push('--no-trunc', stackName, '--format', 'json')
    return this.buildCommand('service', args, 'json_array')
  }

  serviceUpdate(
    stackName: string,
    options: {
      limitCpu?: string
      limitMemory?: string
      labelAdd?: string[]
      containerLabelAdd?: string[]
    }
  ): DockerCommand<ExecResult> {
    const args = ['update']

    if (options.limitCpu) {
      args.push('--limit-cpu', options.limitCpu)
    }

    if (options.limitMemory) {
      args.push('--limit-memory', options.limitMemory)
    }

    if (options.labelAdd) {
      options.labelAdd.forEach((label) => {
        args.push('--label-add', label)
      })
    }

    if (options.containerLabelAdd) {
      options.containerLabelAdd.forEach((label) => {
        args.push('--container-label-add', label)
      })
    }

    args.push(stackName)
    return this.buildCommand('service', args, 'raw_text')
  }

  serviceScale(stackName: string, replicas: number): DockerCommand<ExecResult> {
    return this.buildCommand('service', ['scale', `${stackName}=${replicas}`], 'raw_text')
  }

  serviceCreate(options: {
    name: string
    image: string
    detach?: boolean
    restartCondition?: string
    mode?: string
    mounts?: string[]
    command?: string[]
  }): DockerCommand<ExecResult> {
    const args = ['create']

    if (options.detach) args.push('-d')
    if (options.name) args.push('--name', options.name)
    if (options.restartCondition) args.push('--restart-condition', options.restartCondition)
    if (options.mode) args.push('--mode', options.mode)

    if (options.mounts) {
      options.mounts.forEach((mount) => {
        args.push('--mount', mount)
      })
    }

    args.push(options.image)

    if (options.command) {
      args.push(...options.command)
    }

    return this.buildCommand('service', args, 'raw_text')
  }

  serviceRm(stackName: string): DockerCommand<ExecResult> {
    return this.buildCommand('service', ['rm', stackName], 'raw_text')
  }

  serviceLogs(
    serviceName: string,
    options?: {
      tail?: number
      follow?: boolean
      timestamps?: boolean
    }
  ): DockerCommand<ExecResult> {
    const args = ['logs']

    if (options?.tail) {
      args.push('--tail', options.tail.toString())
    }

    if (options?.follow) {
      args.push('--follow')
    }

    if (options?.timestamps) {
      args.push('--timestamps')
    }

    args.push(serviceName)
    return this.buildCommand('service', args, 'raw_text')
  }

  // Secret Commands
  secretCreate(secretName: string, secretValue: string): DockerCommand<ExecResult> {
    return this.buildCommand('secret', ['create', secretName, '-'], 'raw_text', secretValue)
  }

  secretLs(): DockerCommand<SecretInfo[]> {
    const args = ['ls', '--format', 'json']
    return this.buildCommand('secret', args, 'json_array')
  }

  secretRm(secretName: string): DockerCommand<ExecResult> {
    return this.buildCommand('secret', ['rm', secretName], 'raw_text')
  }

  // Container Commands (docker run)
  run(options: {
    image: string
    command?: string
    args?: string[]
    remove?: boolean
    interactive?: boolean
    tty?: boolean
    env?: string[]
    volumes?: string[]
    networks?: string[]
    stdin?: string
  }): DockerCommand<ExecResult> {
    const args = []

    if (options.remove) args.push('--rm')
    if (options.interactive) args.push('-i')
    if (options.tty) args.push('-t')

    if (options.env) {
      options.env.forEach((envVar) => {
        args.push('-e', envVar)
      })
    }

    if (options.volumes) {
      options.volumes.forEach((volume) => {
        args.push('-v', volume)
      })
    }

    if (options.networks) {
      options.networks.forEach((network) => {
        args.push('--network', network)
      })
    }

    args.push(options.image)

    if (options.command) {
      args.push(options.command)
    }

    if (options.args) {
      args.push(...options.args)
    }

    return this.buildCommand('run', args, 'raw_text', options.stdin)
  }

  // Volume Commands
  volumeLs(filters?: string[]): DockerCommand<VolumeInfo[]> {
    const args = ['ls']

    if (filters) {
      filters.forEach((filter) => {
        args.push('--filter', filter)
      })
    }

    args.push('--format', 'json')
    return this.buildCommand('volume', args, 'json_array')
  }

  volumeRm(volumeNames: string[]): DockerCommand<ExecResult> {
    const args = ['rm', ...volumeNames]
    return this.buildCommand('volume', args, 'raw_text')
  }

  // Network Commands
  networkLs(): DockerCommand<NetworkInfo[]> {
    const args = ['ls', '--format', 'json']
    return this.buildCommand('network', args, 'json_array')
  }

  networkCreate(
    networkName: string,
    options?: {
      driver?: string
      external?: boolean
    }
  ): DockerCommand<ExecResult> {
    const args = ['create']

    if (options?.driver) {
      args.push('--driver', options.driver)
    }

    if (options?.external) {
      args.push('--external')
    }

    args.push(networkName)
    return this.buildCommand('network', args, 'raw_text')
  }

  networkRm(networkName: string): DockerCommand<ExecResult> {
    return this.buildCommand('network', ['rm', networkName], 'raw_text')
  }

  // Container listing
  ps(): DockerCommand<ContainerInfo[]> {
    const args = ['--format', 'json']
    return this.buildCommand('ps', args, 'json_array')
  }

  psAll(): DockerCommand<ContainerInfo[]> {
    const args = ['-a', '--format', 'json']
    return this.buildCommand('ps', args, 'json_array')
  }

  // Image Commands
  images(): DockerCommand<ImageInfo[]> {
    const args = ['--format', 'json']
    return this.buildCommand('images', args, 'json_array')
  }

  // Container inspect
  inspect(containerName: string): DockerCommand<ContainerInfo> {
    const args = [containerName]
    return this.buildCommand('inspect', args, 'json_single')
  }

  // Node Commands
  nodeLs(): DockerCommand<NodeInfo[]> {
    const args = ['ls', '--format', 'json']
    return this.buildCommand('node', args, 'json_array')
  }
}
