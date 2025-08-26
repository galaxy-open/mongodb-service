import { args, BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import string from '@adonisjs/core/helpers/string'
import { stubsRoot } from '#stubs/main'
import generators from '#stubs/generators'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'

export default class MakeService extends BaseCommand {
  static commandName = 'make:svc'
  static description = 'Create a service class'

  /**
   * The service name. Can be nested using slashes, e.g., `Auth` or `Admin/User`.
   */
  @args.string({ description: 'Name of the service (e.g., Auth or Admin/User)' })
  declare name: string

  @flags.boolean({
    description: 'Generate only the service class',
    alias: 's',
  })
  declare serviceOnly: boolean

  static options: CommandOptions = {
    staysAlive: false,
  }

  public async run(): Promise<void> {
    const codemods = await this.createCodemods()

    const entity = this.app.generators.createEntity(this.name)

    // Core service name, PascalCased
    const serviceName = string.pascalCase(entity.name)

    // Service class name
    const serviceClassName = `${serviceName}Service`

    // Check if file already exists
    const serviceDestination = this.app.makePath(
      'app/services',
      entity.path,
      `${string.snakeCase(serviceClassName)}.ts`
    )

    const serviceExists = await this.fileExists(serviceDestination)

    // Determine if we need to generate the service
    let generateService = !this.serviceOnly

    // If service already exists, skip generation
    if (serviceExists) {
      this.logger.info(`${this.colors.cyan('ℹ')} Service already exists`)
      return
    }

    const stubData = {
      flags: this.parsed.flags,
      entity: entity,
      generators: generators,
      serviceName: serviceName,
      className: serviceClassName,
    }

    const createdFiles: string[] = []

    // Generate service
    if (generateService) {
      if (serviceExists) {
        this.logger
          .action(`create ${this.colors.yellow(serviceDestination)}`)
          .skipped('File already exists')
      } else {
        try {
          await codemods.makeUsingStub(stubsRoot, 'make/service/main.stub', stubData)
          this.logger.action(`create ${this.colors.green(serviceDestination)}`).succeeded()
          createdFiles.push(`Service: ${serviceDestination}`)
        } catch (error) {
          let errorMessage = `Failed to create service: ${serviceDestination}`
          if (error instanceof Error && error.message) {
            errorMessage = error.message
          }
          this.logger.action('create').failed(errorMessage)
          this.exitCode = 1
          return
        }
      }
    }

    // Success message
    if (createdFiles.length > 0) {
      this.logger.info('--------------------------------------------------------')
      this.logger.success(`${this.colors.green('✔')} Service created successfully!`)
      createdFiles.forEach((file) => {
        this.logger.info(`  ${file}`)
      })
      this.logger.info('--------------------------------------------------------')
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK)
      return true
    } catch {
      return false
    }
  }
}
