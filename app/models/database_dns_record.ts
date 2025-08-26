import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DatabaseDnsZone from '#models/database_dns_zone'
import DnsRecordTypes from '#enums/dns_record_types'
import DnsRecordStatus from '#enums/dns_record_status'

export default class DatabaseDnsRecord extends BaseModel {
  static table = 'database_dns_records'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare stackName: string

  @column()
  declare recordName: string

  @column()
  declare recordType: DnsRecordTypes

  @column()
  declare recordValue: string

  @column()
  declare ttl: number

  @column()
  declare databaseDnsZoneId: string

  @column()
  declare status: DnsRecordStatus

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serialize: (value: DateTime) => value.toISO(),
  })
  declare updatedAt: DateTime

  @belongsTo(() => DatabaseDnsZone, { foreignKey: 'databaseDnsZoneId' })
  declare databaseDnsZone: BelongsTo<typeof DatabaseDnsZone>
}
