import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Region from '#models/region'
import DatabaseEngines from '#enums/database_engines'
import RegionCodes from '#enums/region_codes'
import DatabaseDnsRecord from '#models/database_dns_record'

export default class DatabaseDnsZone extends BaseModel {
  static table = 'database_dns_zones'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare regionCode: RegionCodes

  @column()
  declare databaseEngine: DatabaseEngines

  @column()
  declare externalZoneIdentifier: string

  @column()
  declare domainName: string

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

  @belongsTo(() => Region, { foreignKey: 'regionCode' })
  declare region: BelongsTo<typeof Region>

  @hasMany(() => DatabaseDnsRecord, { foreignKey: 'databaseDnsZoneId' })
  declare dnsRecords: HasMany<typeof DatabaseDnsRecord>
}
