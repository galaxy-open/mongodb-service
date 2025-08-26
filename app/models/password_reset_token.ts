import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class PasswordResetToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare value: string

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

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isValid() {
    return this.expiresAt > DateTime.now()
  }
}
