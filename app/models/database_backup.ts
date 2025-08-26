import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DatabaseInstance from '#models/database_instance'
import User from '#models/user'
import BackupTypes from '#enums/backup_types'
import BackupStatus from '#enums/backup_status'

export default class DatabaseBackup extends BaseModel {
  static table = 'database_backups'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare databaseInstanceId: string

  @column()
  declare backupType: BackupTypes

  @column()
  declare filePath: string | null

  @column()
  declare fileSizeBytes: number | null

  @column()
  declare status: BackupStatus

  @column.dateTime({ serialize: (value: DateTime) => value.toISO() })
  declare startedAt: DateTime

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare completedAt: DateTime | null

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare expiresAt: DateTime | null

  @column()
  declare createdByUserId: string | null

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serialize: (value: DateTime) => value.toISO(),
  })
  declare updatedAt: DateTime

  @belongsTo(() => DatabaseInstance, { foreignKey: 'databaseInstanceId' })
  declare instance: BelongsTo<typeof DatabaseInstance>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>
}
