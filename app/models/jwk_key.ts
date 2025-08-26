import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export interface PublicKeyData {
  // RSA keys
  n?: string // modulus
  e?: string // exponent
  // EC keys
  x?: string
  y?: string
  crv?: string // curve
  [key: string]: any
}

export default class JwkKey extends BaseModel {
  @column({ isPrimary: true })
  declare kid: string

  @column()
  declare keyType: string

  @column()
  declare algorithm: string

  @column()
  declare use: string

  @column()
  declare publicKeyData: PublicKeyData

  @column()
  declare privateKeyPem: string

  @column()
  declare isActive: boolean

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
}
