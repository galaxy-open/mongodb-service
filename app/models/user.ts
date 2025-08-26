import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany, hasOne, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { BelongsTo, HasMany, HasOne, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import PasswordResetToken from '#models/password_reset_token'
import Organization from '#models/organization'
import TrustedIdentityProvider from '#models/trusted_identity_provider'
import DatabaseInstance from '#models/database_instance'
import DatabaseBackup from '#models/database_backup'
import JobHistory from '#models/job_history'
import OAuthAccessToken from '#models/oauth_access_token'
import OAuthRefreshToken from '#models/oauth_refresh_token'
import OAuthAuthorizationCode from '#models/oauth_authorization_code'
import OauthConsent from '#models/oauth_consent'
import Owner from '#models/owner'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder, SoftDeletes) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare username: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string | null

  @column()
  declare externalIdpId: string | null

  @column()
  declare externalUserId: string | null

  @column()
  declare isSystemAdmin: boolean

  @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value.toISO() })
  declare createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serialize: (value: DateTime | null) => value?.toISO() ?? null,
  })
  declare updatedAt: DateTime | null

  @column.dateTime({ serialize: (value: DateTime | null) => value?.toISO() ?? null })
  declare deletedAt: DateTime | null

  @hasMany(() => PasswordResetToken)
  declare passwordResetTokens: HasMany<typeof PasswordResetToken>

  @manyToMany(() => Organization, {
    pivotTable: 'organization_users',
    pivotColumns: ['role_name'],
  })
  declare organizations: ManyToMany<typeof Organization>

  @belongsTo(() => TrustedIdentityProvider, {
    foreignKey: 'externalIdpId',
  })
  declare trustedIdentityProvider: BelongsTo<typeof TrustedIdentityProvider>

  @hasMany(() => DatabaseInstance, { foreignKey: 'createdByUserId' })
  declare createdInstances: HasMany<typeof DatabaseInstance>

  @hasOne(() => Owner, { foreignKey: 'userId' })
  declare owner: HasOne<typeof Owner>

  @hasMany(() => DatabaseBackup, { foreignKey: 'createdByUserId' })
  declare createdBackups: HasMany<typeof DatabaseBackup>

  @hasMany(() => JobHistory, { foreignKey: 'userId' })
  declare jobHistory: HasMany<typeof JobHistory>

  @hasMany(() => OAuthAccessToken, { foreignKey: 'userId' })
  declare oauthAccessTokens: HasMany<typeof OAuthAccessToken>

  @hasMany(() => OAuthRefreshToken, { foreignKey: 'userId' })
  declare oauthRefreshTokens: HasMany<typeof OAuthRefreshToken>

  @hasMany(() => OAuthAuthorizationCode, { foreignKey: 'userId' })
  declare oauthAuthorizationCodes: HasMany<typeof OAuthAuthorizationCode>

  @hasMany(() => OauthConsent, { foreignKey: 'userId' })
  declare oauthConsents: HasMany<typeof OauthConsent>
}
