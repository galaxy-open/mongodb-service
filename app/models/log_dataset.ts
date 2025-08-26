import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import DatabaseEngines from '#enums/database_engines'
import LogDatasetTypes from '#enums/log_dataset_types'

export default class LogDataset extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare databaseEngine: DatabaseEngines | null

  @column()
  declare datasetType: LogDatasetTypes

  @column()
  declare datasetName: string

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null
}
