import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import string from '@adonisjs/core/helpers/string'
import { stubsRoot } from '#stubs/main'
import generators from '#stubs/generators'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'

export default class MakeRepository extends BaseCommand {
  static commandName = 'make:repository'
  static description = 'Create a new repository class'

  /**
   * The repository name. Can be nested using slashes, e.g., `Admin/User`.
   */
  @args.string({ description: 'Name of the repository (e.g., User or Admin/User)' })
  declare name: string

  static options: CommandOptions = {
    staysAlive: false, // Ends the command after execution
  }

  public async run(): Promise<void> {
    const codemods = await this.createCodemods()

    const entity = this.app.generators.createEntity(this.name)

    // Core model name, PascalCased (e.g., User, UserProfile from Admin/UserProfile)
    const modelName = string.pascalCase(entity.name)

    // Verify if the model file exists
    const modelFileName = string.snakeCase(entity.name)
    const modelPathParts = ['app/models']
    if (entity.path && entity.path !== '.') {
      modelPathParts.push(string.snakeCase(entity.path))
    }
    modelPathParts.push(`${modelFileName}.ts`)
    const modelPath = this.app.makePath(...modelPathParts)

    try {
      await access(modelPath, constants.F_OK)
    } catch (error) {
      this.logger.error(`Model ${this.colors.cyan(modelPath)} does not exist.`)
      this.logger.info(
        `Please create the model first using ${this.colors.yellow('ace make:model ' + this.name)}`
      )
      this.exitCode = 1
      return
    }

    // Full model name for import, including namespace (e.g., User, Admin/User)
    const modelNameParts = this.name
      .split('/')
      .filter((part) => part.length > 0)
      .map((part) => string.pascalCase(part))
    const modelImportName = modelNameParts.join('/').toLowerCase()

    // Repository class name (e.g., UserRepository, UserProfileRepository)
    const repositoryClassName = `${modelName}Repository`

    // Destination path for the repository file
    const destination = this.app.makePath(
      'app/repositories', // Base directory for repositories
      entity.path, // Namespace subdirectory (e.g., admin)
      `${repositoryClassName}.ts` // Repository file name (e.g., user_profile_repository.ts)
    )

    const stubData = {
      flags: this.parsed.flags,
      entity: entity,
      generators: generators,
      modelName: modelName, // For {{ modelName }} in stub
      modelImportName: modelImportName, // For {{ modelImportName }} in stub
      className: repositoryClassName, // For {{ className }} in stub
    }

    try {
      await codemods.makeUsingStub(
        stubsRoot, // Root directory of stubs
        'make/repository/main.stub', // Path to the stub file
        stubData // Data for the stub
      )
      this.logger.action(`create ${this.colors.green(destination)}`).succeeded()
    } catch (error) {
      let errorMessage = `Failed to create repository: ${destination}`
      if (error instanceof Error && error.message) {
        errorMessage = error.message
      }
      this.logger.action('create').failed(errorMessage)
      this.exitCode = 1
      return
    }

    this.logger.info('--------------------------------------------------------')
    this.logger.success(`${this.colors.green('✔')} Repository class created successfully!`)
    this.logger.info(`  Repository: ${destination}`)
    this.logger.info('--------------------------------------------------------')
  }
}
