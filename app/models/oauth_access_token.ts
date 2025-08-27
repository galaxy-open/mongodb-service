import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import OAuthClient from '#models/oauth_client'
import OAuthRefreshToken from '#models/oauth_refresh_token'
import Organization from '#models/organization'

export default class OAuthAccessToken extends BaseModel {
  static table = 'oauth_access_tokens'

  @column({ isPrimary: true })
  declare id: string

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

  @column.dateTime({ serialize: (value: DateTime) => value.toISO() })
  declare expiresAt: DateTime

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

  @hasOne(() => OAuthRefreshToken, { foreignKey: 'accessTokenId' })
  declare refreshToken: HasOne<typeof OAuthRefreshToken>
}
