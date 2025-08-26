import { DateTime } from 'luxon'
import { BaseModel, beforeSave, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import OAuthAccessToken from '#models/oauth_access_token'
import OAuthRefreshToken from '#models/oauth_refresh_token'
import OAuthAuthorizationCode from '#models/oauth_authorization_code'
import OauthConsent from '#models/oauth_consent'
import hash from '@adonisjs/core/services/hash'

export default class OAuthClient extends BaseModel {
  static table = 'oauth_clients'

  @column({ isPrimary: true })
  declare clientId: string

  @column()
  declare clientSecretHash: string

  @column()
  declare clientName: string

  @column()
  declare redirectUris: string[]

  @column()
  declare grantTypes: string[]

  @column()
  declare allowedScopes: string[] | null

  @column()
  declare isTrusted: boolean

  @column()
  declare isConfidential: boolean

  @column()
  declare accessTokenLifetime: number

  @column()
  declare refreshTokenLifetime: number

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serialize: (value: DateTime) => value.toISO(),
  })
  declare updatedAt: DateTime

  // Relationships
  @hasMany(() => OAuthAccessToken, { foreignKey: 'clientId' })
  declare accessTokens: HasMany<typeof OAuthAccessToken>

  @hasMany(() => OAuthRefreshToken, { foreignKey: 'clientId' })
  declare refreshTokens: HasMany<typeof OAuthRefreshToken>

  @hasMany(() => OAuthAuthorizationCode, { foreignKey: 'clientId' })
  declare authorizationCodes: HasMany<typeof OAuthAuthorizationCode>

  @hasMany(() => OauthConsent, { foreignKey: 'clientId' })
  declare consents: HasMany<typeof OauthConsent>

  @beforeSave()
  static async encryptClientSecret(oauthClient: OAuthClient) {
    if (oauthClient.$dirty.clientSecretHash) {
      oauthClient.clientSecretHash = await hash.make(oauthClient.clientSecretHash)
    }
  }
}
