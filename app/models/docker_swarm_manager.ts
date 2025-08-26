import { DateTime } from 'luxon'
import {
  BaseModel,
  afterFetch,
  afterFind,
  beforeSave,
  belongsTo,
  column,
  hasMany,
} from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Owner from '#models/owner'
import DockerSwarmWorker from '#models/docker_swarm_worker'
import ClusterTypes from '#enums/cluster_types'
import ServiceTypes from '#enums/service_types'
import ClusterHealthStatus from '#enums/cluster_health_status'
import RegionCodes from '#enums/region_codes'
import Region from '#models/region'
import encryption from '@adonisjs/core/services/encryption'

export default class DockerSwarmManager extends BaseModel {
  static table = 'docker_swarm_managers'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare ownerId: string | null

  @column()
  declare name: string

  @column()
  declare regionCode: RegionCodes

  @column()
  declare hostnamePrefix: string

  @column()
  declare serviceType: ServiceTypes

  @column()
  declare clusterType: ClusterTypes

  @column()
  declare dockerHostUrl: string

  @column()
  declare ca: string

  @column()
  declare cert: string

  @column()
  declare key: string

  @column()
  declare healthStatus: ClusterHealthStatus

  @column.dateTime()
  declare lastHealthCheck: DateTime | null

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

  @belongsTo(() => Owner, { foreignKey: 'ownerId' })
  declare owner: BelongsTo<typeof Owner>

  @belongsTo(() => Region, { foreignKey: 'regionCode' })
  declare region: BelongsTo<typeof Region>

  @hasMany(() => DockerSwarmWorker, { foreignKey: 'dockerSwarmManagerId' })
  declare workers: HasMany<typeof DockerSwarmWorker>

  @beforeSave()
  static async encryptCertificates(dockerSwarmManager: DockerSwarmManager) {
    if (dockerSwarmManager.$dirty.cert) {
      dockerSwarmManager.cert = encryption.encrypt(dockerSwarmManager.cert)
    }
    if (dockerSwarmManager.$dirty.ca) {
      dockerSwarmManager.ca = encryption.encrypt(dockerSwarmManager.ca)
    }
    if (dockerSwarmManager.$dirty.key) {
      dockerSwarmManager.key = encryption.encrypt(dockerSwarmManager.key)
    }
  }

  @afterFetch()
  static async decryptCertificatesAfterFetch(dockerSwarmManagers: DockerSwarmManager[]) {
    dockerSwarmManagers.forEach((dockerSwarmManager) => {
      if (dockerSwarmManager.cert) {
        dockerSwarmManager.cert = encryption.decrypt(dockerSwarmManager.cert)!
      }
      if (dockerSwarmManager.ca) {
        dockerSwarmManager.ca = encryption.decrypt(dockerSwarmManager.ca)!
      }
      if (dockerSwarmManager.key) {
        dockerSwarmManager.key = encryption.decrypt(dockerSwarmManager.key)!
      }
    })
  }

  @afterFind()
  static async decryptCertificatesAfterFind(dockerSwarmManager: DockerSwarmManager) {
    if (dockerSwarmManager.cert) {
      dockerSwarmManager.cert = encryption.decrypt(dockerSwarmManager.cert)!
    }
    if (dockerSwarmManager.ca) {
      dockerSwarmManager.ca = encryption.decrypt(dockerSwarmManager.ca)!
    }
    if (dockerSwarmManager.key) {
      dockerSwarmManager.key = encryption.decrypt(dockerSwarmManager.key)!
    }
  }
}
