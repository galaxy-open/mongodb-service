import { args, BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import string from '@adonisjs/core/helpers/string'
import { stubsRoot } from '#stubs/main'
import generators from '#stubs/generators'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'

export default class MakeRepoComplete extends BaseCommand {
  static commandName = 'make:repo'
  static description = 'Create a repository'

  /**
   * The repository name. Can be nested using slashes, e.g., `Admin/User`.
   */
  @args.string({ description: 'Name of the repository (e.g., User or Admin/User)' })
  declare name: string

  @flags.boolean({
    description: 'Generate only the repository class',
    alias: 'r',
  })
  declare repositoryOnly: boolean

  static options: CommandOptions = {
    staysAlive: false,
  }

  public async run(): Promise<void> {
    const codemods = await this.createCodemods()

    const entity = this.app.generators.createEntity(this.name)

    // Core model name, PascalCased
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

    // Full model name for import
    const modelNameParts = this.name
      .split('/')
      .filter((part) => part.length > 0)
      .map((part) => string.pascalCase(part))
    const modelImportName = modelNameParts.join('/').toLowerCase()

    // Repository class name
    const repositoryClassName = `${modelName}Repository`

    const stubData = {
      flags: this.parsed.flags,
      entity: entity,
      generators: generators,
      modelName: modelName,
      modelImportName: modelImportName,
      className: repositoryClassName,
    }

    const createdFiles: string[] = []

    // Generate repository
    if (!this.repositoryOnly) {
      const repositoryDestination = this.app.makePath(
        'app/repositories',
        entity.path,
        `${string.snakeCase(repositoryClassName)}.ts`
      )

      try {
        await codemods.makeUsingStub(stubsRoot, 'make/repository/main.stub', stubData)
        this.logger.action(`create ${this.colors.green(repositoryDestination)}`).succeeded()
        createdFiles.push(`Repository: ${repositoryDestination}`)
      } catch (error) {
        let errorMessage = `Failed to create repository: ${repositoryDestination}`
        if (error instanceof Error && error.message) {
          errorMessage = error.message
        }
        this.logger.action('create').failed(errorMessage)
        this.exitCode = 1
        return
      }
    }

    // Success message
    this.logger.info('--------------------------------------------------------')
    this.logger.success(`${this.colors.green('✔')} Repository created successfully!`)
    createdFiles.forEach((file) => {
      this.logger.info(`  ${file}`)
    })
    this.logger.info('--------------------------------------------------------')
  }
}
