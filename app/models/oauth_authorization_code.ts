import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import OAuthClient from '#models/oauth_client'
import Organization from '#models/organization'

export default class OAuthAuthorizationCode extends BaseModel {
  static table = 'oauth_authorization_codes'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare clientId: string

  @column()
  declare userId: string

  @column()
  declare organizationId: string | null

  @column()
  declare redirectUri: string

  @column()
  declare scopes: string[] | null

  @column()
  declare state: string | null

  @column()
  declare codeChallenge: string | null

  @column()
  declare codeChallengeMethod: string | null

  @column.dateTime({ serialize: (value: DateTime) => value.toISO() })
  declare expiresAt: DateTime

  @column()
  declare isUsed: boolean

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare usedAt: DateTime | null

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  // Relationships
  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => OAuthClient, { foreignKey: 'clientId' })
  declare client: BelongsTo<typeof OAuthClient>

  @belongsTo(() => Organization, { foreignKey: 'organizationId' })
  declare organization: BelongsTo<typeof Organization>
}
