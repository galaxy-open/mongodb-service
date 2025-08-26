import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DatabaseInstance from '#models/database_instance'
import Region from '#models/region'
import TLSModes from '#enums/tls_modes'
import RegionCodes from '#enums/region_codes'

export default class DatabaseConnection extends BaseModel {
  static table = 'database_connections'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare databaseInstanceId: string

  @column()
  declare regionCode: RegionCodes

  @column()
  declare port: number | null

  @column()
  declare hostnameUri: string | null

  @column()
  declare adminUri: string | null

  @column()
  declare backupUri: string | null

  @column()
  declare monitorUri: string | null

  @column()
  declare tlsMode: TLSModes

  @column()
  declare adminPassword: string | null

  @column({ serializeAs: null })
  declare backupPassword: string | null

  @column({ serializeAs: null })
  declare monitorPassword: string | null

  @column()
  declare replicaKey: string | null

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

  @belongsTo(() => Region, { foreignKey: 'regionCode' })
  declare region: BelongsTo<typeof Region>
}
