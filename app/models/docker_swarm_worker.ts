import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DockerSwarmManager from '#models/docker_swarm_manager'
import WorkerTypes from '#enums/worker_types'

export default class DockerSwarmWorker extends BaseModel {
  static table = 'docker_swarm_workers'
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare dockerSwarmManagerId: string

  @column()
  declare name: string

  @column()
  declare workerNumber: number

  @column()
  declare type: WorkerTypes

  @column()
  declare instanceType: string

  @column()
  declare maxInstances: number

  @column()
  declare currentInstances: number

  @column()
  declare isActive: boolean

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
}
