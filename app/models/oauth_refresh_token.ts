import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import OAuthClient from '#models/oauth_client'
import OAuthAccessToken from '#models/oauth_access_token'
import Organization from '#models/organization'

export default class OAuthRefreshToken extends BaseModel {
  static table = 'oauth_refresh_tokens'

  @column({ isPrimary: true })
  declare tokenHash: string

  @column()
  declare accessTokenHash: string

  @column()
  declare clientId: string

  @column()
  declare userId: string

  @column()
  declare organizationId: string | null

  @column()
  declare scopes: string[] | null

  @column()
  declare isRevoked: boolean

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare expiresAt: DateTime | null

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare revokedAt: DateTime | null

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  // Relationships
  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => OAuthClient, { foreignKey: 'clientId' })
  declare client: BelongsTo<typeof OAuthClient>

  @belongsTo(() => Organization, { foreignKey: 'organizationId' })
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => OAuthAccessToken, { foreignKey: 'accessTokenHash', localKey: 'tokenHash' })
  declare accessToken: BelongsTo<typeof OAuthAccessToken>
}
