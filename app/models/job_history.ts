import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DatabaseInstance from '#models/database_instance'
import Owner from '#models/owner'
import User from '#models/user'
import JobStatus from '#enums/job_status'

export default class JobHistory extends BaseModel {
  static table = 'job_history'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare jobIdBullmq: string | null

  @column()
  declare queueName: string

  @column()
  declare jobName: string | null

  @column()
  declare status: JobStatus

  @column()
  declare databaseInstanceId: string | null

  @column()
  declare ownerId: string

  @column()
  declare createdByUserId: string

  @column()
  declare inputData: Record<string, any> | null

  @column()
  declare resultData: Record<string, any> | null

  @column.dateTime({ serialize: (value: DateTime) => value.toISO() })
  declare createdAtQueue: DateTime

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare processingStartedAt: DateTime | null

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare processingFinishedAt: DateTime | null

  @column()
  declare errorMessage: string | null

  @column()
  declare errorStacktrace: string | null

  @column()
  declare attemptsMade: number

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serialize: (value: DateTime) => value.toISO(),
  })
  declare updatedAt: DateTime

  @belongsTo(() => DatabaseInstance, { foreignKey: 'databaseInstanceId' })
  declare databaseInstance: BelongsTo<typeof DatabaseInstance>

  @belongsTo(() => Owner, { foreignKey: 'ownerId' })
  declare owner: BelongsTo<typeof Owner>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdByUser: BelongsTo<typeof User>
}
