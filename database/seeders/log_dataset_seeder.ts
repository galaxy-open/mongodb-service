import { BaseSeeder } from '@adonisjs/lucid/seeders'
import LogDataset from '#models/log_dataset'
import DatabaseEngines from '#enums/database_engines'
import LogDatasetTypes from '#enums/log_dataset_types'
import env from '#start/env'

export default class extends BaseSeeder {
  async run() {
    const defaultDatasets = [
      {
        databaseEngine: DatabaseEngines.MONGODB,
        datasetType: LogDatasetTypes.DATABASE,
        datasetName: `${env.get('LOG_DATASET_PREFIX', 'mongodb-service')}-mongodb-${env.get('ENVIRONMENT', 'development')}`,
      },
    ]

    await LogDataset.createMany(defaultDatasets)
  }
}
