import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Owner from '#models/owner'
import InstanceSize from '#models/instance_size'
import Region from '#models/region'
import DatabaseVersion from '#models/database_version'
import User from '#models/user'
import InstanceStatus from '#enums/instance_status'
import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'
import TLSModes from '#enums/tls_modes'
import RegionCodes from '#enums/region_codes'
import DatabaseVersions from '#enums/database_versions'
import JobHistory from '#models/job_history'
import DatabaseConnection from '#models/database_connection'
import DatabaseDeployment from '#models/database_deployment'
import DatabaseBackup from '#models/database_backup'

export default class DatabaseInstance extends compose(BaseModel, SoftDeletes) {
  static table = 'database_instances'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare ownerId: string

  @column()
  declare name: string

  @column()
  declare stackName: string

  @column()
  declare databaseEngine: DatabaseEngines

  @column()
  declare deploymentType: DeploymentTypes

  @column()
  declare tlsMode: TLSModes

  @column()
  declare instanceSizeId: string

  @column()
  declare regionCode: RegionCodes

  @column()
  declare databaseVersion: DatabaseVersions

  @column()
  declare status: InstanceStatus

  @column()
  declare containerCount: number

  @column()
  declare createdByUserId: string

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare scheduledDeletionAt: DateTime | null

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

  @belongsTo(() => Region, { foreignKey: 'regionCode' })
  declare region: BelongsTo<typeof Region>

  @belongsTo(() => DatabaseVersion, { foreignKey: 'databaseVersion' })
  declare version: BelongsTo<typeof DatabaseVersion>

  @belongsTo(() => InstanceSize, { foreignKey: 'instanceSizeId' })
  declare size: BelongsTo<typeof InstanceSize>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>

  @belongsTo(() => Owner, { foreignKey: 'ownerId' })
  declare owner: BelongsTo<typeof Owner>

  @hasOne(() => DatabaseConnection, { foreignKey: 'databaseInstanceId' })
  declare connection: HasOne<typeof DatabaseConnection>

  @hasOne(() => DatabaseDeployment, { foreignKey: 'databaseInstanceId' })
  declare deployment: HasOne<typeof DatabaseDeployment>

  @hasMany(() => DatabaseBackup)
  declare backups: HasMany<typeof DatabaseBackup>

  @hasMany(() => JobHistory, { foreignKey: 'databaseInstanceId' })
  declare jobHistory: HasMany<typeof JobHistory>
}
