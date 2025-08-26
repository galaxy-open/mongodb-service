import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import DockerSwarmManager from '#models/docker_swarm_manager'
import DockerSwarmWorker from '#models/docker_swarm_worker'

export default class DatabaseDeployment extends BaseModel {
  static table = 'database_deployments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare databaseInstanceId: string

  @column()
  declare dockerComposeContent: string | null

  @column()
  declare exporterComposeContent: string | null

  @column()
  declare backupEnabled: boolean

  @column()
  declare dockerSwarmManagerId: string | null

  @column.dateTime({
    autoCreate: true,
    serialize: (value: DateTime) => value.toISO(),
  })
  declare backupDatetime: DateTime

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare lastBackupAt: DateTime | null

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare deploymentStartedAt: DateTime | null

  @column()
  declare deploymentDurationMs: number | null

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serialize: (value: DateTime) => value.toISO(),
  })
  declare updatedAt: DateTime

  @belongsTo(() => DockerSwarmManager, { foreignKey: 'dockerSwarmManagerId' })
  declare dockerSwarmManager: BelongsTo<typeof DockerSwarmManager>

  @manyToMany(() => DockerSwarmWorker, {
    pivotTable: 'database_deployment_workers',
    pivotForeignKey: 'database_deployment_id',
    pivotRelatedForeignKey: 'docker_swarm_worker_id',
    pivotTimestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    pivotColumns: ['assigned_at'],
  })
  declare workers: ManyToMany<typeof DockerSwarmWorker>
}
