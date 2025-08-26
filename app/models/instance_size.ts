import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import DatabaseInstance from '#models/database_instance'
import DeploymentTypes from '#enums/deployment_types'
import DatabaseEngines from '#enums/database_engines'
import DatabaseInstanceNames from '#enums/database_instance_names'

export default class InstanceSize extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: DatabaseInstanceNames

  @column()
  declare displayName: string

  @column()
  declare deploymentType: DeploymentTypes

  @column()
  declare databaseEngine: DatabaseEngines

  @column()
  declare cpuCores: number

  @column()
  declare cpuResources: string

  @column()
  declare memoryMb: number

  @column()
  declare diskGb: number

  get diskGbString(): string {
    return `${this.diskGb}G`
  }

  @column()
  declare priceMonthlyCents: number

  get priceMonthly(): string {
    return (this.priceMonthlyCents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    }) // Example:from 2400 to $24.00
  }

  get memoryGbString(): string {
    return `${this.memoryMb / 1024}G`
  }

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

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare deletedAt: DateTime | null

  @hasMany(() => DatabaseInstance, { foreignKey: 'instanceSizeId' })
  declare instances: HasMany<typeof DatabaseInstance>

  serialize() {
    return {
      ...this.$attributes,
      priceMonthly: this.priceMonthly,
      memoryGbString: this.memoryGbString,
    }
  }
}
