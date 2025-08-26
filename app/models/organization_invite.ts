import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Role from '#models/role'
import Organization from '#models/organization'
import UserRoles from '#enums/user_roles'

export default class OrganizationInvite extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare invitedByUserId: string

  @column()
  declare canceledByUserId: string | null

  @column()
  declare roleName: UserRoles

  @column()
  declare email: string

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare acceptedAt: DateTime | null

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare canceledAt: DateTime | null

  @column.dateTime({ serialize: (value: DateTime) => value.toISO() })
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serialize: (value: DateTime) => value.toISO(),
  })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'invitedByUserId',
  })
  declare invitedByUser: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'canceledByUserId',
  })
  declare canceledByUser: BelongsTo<typeof User>

  @belongsTo(() => Role, { foreignKey: 'roleName' })
  declare role: BelongsTo<typeof Role>

  @column()
  declare organizationId: string

  @belongsTo(() => Organization, { foreignKey: 'organizationId' })
  declare organization: BelongsTo<typeof Organization>
}
