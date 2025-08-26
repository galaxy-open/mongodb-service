import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import DatabaseEngines from '#enums/database_engines'
import DatabaseVersions from '#enums/database_versions'
import DatabaseInstance from '#models/database_instance'

export default class DatabaseVersion extends compose(BaseModel, SoftDeletes) {
  static table = 'database_versions'

  @column({ isPrimary: true })
  declare version: DatabaseVersions

  @column()
  declare displayName: string

  @column()
  declare databaseEngine: DatabaseEngines

  @column()
  declare isActive: boolean

  @column()
  declare isVisible: boolean

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare endOfLife: DateTime | null

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serialize: (value: DateTime) => value.toISO(),
  })
  declare updatedAt: DateTime

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare deletedAt: DateTime | null

  @hasMany(() => DatabaseInstance, { foreignKey: 'databaseVersion' })
  declare instances: HasMany<typeof DatabaseInstance>
}
