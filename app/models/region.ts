import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import CloudProviders from '#enums/cloud_providers'
import RegionCodes from '#enums/region_codes'
import DatabaseInstance from '#models/database_instance'
import DatabaseConnection from '#models/database_connection'
import DockerSwarmManager from '#models/docker_swarm_manager'
import DatabaseDnsZone from '#models/database_dns_zone'

export default class Region extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true })
  declare code: RegionCodes

  @column()
  declare name: string

  @column()
  declare displayName: string

  @column()
  declare provider: CloudProviders

  @column()
  declare countryCode: string

  @column()
  declare timezone: string

  @column()
  declare isActive: boolean

  @column()
  declare maxInstances: number

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

  @hasMany(() => DatabaseInstance, { foreignKey: 'regionCode' })
  declare instances: HasMany<typeof DatabaseInstance>

  @hasMany(() => DatabaseConnection, { foreignKey: 'regionCode' })
  declare connections: HasMany<typeof DatabaseConnection>

  @hasMany(() => DockerSwarmManager, { foreignKey: 'regionCode' })
  declare dockerSwarmManagers: HasMany<typeof DockerSwarmManager>

  @hasMany(() => DatabaseDnsZone, { foreignKey: 'regionCode' })
  declare dnsZones: HasMany<typeof DatabaseDnsZone>
}
