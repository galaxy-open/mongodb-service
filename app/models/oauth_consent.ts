import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import OauthClient from '#models/oauth_client'

export default class OauthConsent extends BaseModel {
  static table = 'oauth_consents'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare clientId: string

  @column()
  declare scopes: string[]

  @column.dateTime({ serialize: (value: DateTime) => value.toISO() })
  declare grantedAt: DateTime

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare expiresAt: DateTime | null

  @column()
  declare isRevoked: boolean

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serialize: (value: DateTime) => value.toISO(),
  })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => OauthClient, { foreignKey: 'clientId', localKey: 'clientId' })
  declare client: BelongsTo<typeof OauthClient>
}
