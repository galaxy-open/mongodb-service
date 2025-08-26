import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, hasOne, manyToMany } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import type { HasMany, HasOne, ManyToMany } from '@adonisjs/lucid/types/relations'
import OrganizationInvite from '#models/organization_invite'
import User from '#models/user'
import JobHistory from '#models/job_history'
import Owner from '#models/owner'

export default class Organization extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare username: string

  @column()
  declare billingEmail: string

  @column()
  declare ownerUserId: string | null

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

  @hasOne(() => Owner, { foreignKey: 'organizationId' })
  declare owner: HasOne<typeof Owner>

  @hasMany(() => OrganizationInvite, { foreignKey: 'organizationId' })
  declare invites: HasMany<typeof OrganizationInvite>

  @manyToMany(() => User, {
    pivotTable: 'organization_users',
    pivotColumns: ['role_name'],
  })
  declare users: ManyToMany<typeof User>

  @hasMany(() => JobHistory, { foreignKey: 'organizationId' })
  declare jobHistory: HasMany<typeof JobHistory>
}
