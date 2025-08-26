import { inject } from '@adonisjs/core'
import LogDatasetRepository from '#repositories/log_dataset_repository'
import DatabaseEngines from '#enums/database_engines'
import LogDatasetTypes from '#enums/log_dataset_types'

@inject()
export default class LogDatasetService {
  constructor(private logDatasetRepository: LogDatasetRepository) {}

  /**
   * Get dataset name for a specific database engine
   */
  async getDatasetForDatabase(databaseEngine: DatabaseEngines): Promise<string> {
    const dataset = await this.logDatasetRepository.findForDatabase(databaseEngine)

    if (!dataset) {
      throw new Error(`No log dataset configured for database engine: ${databaseEngine}`)
    }

    return dataset.datasetName
  }

  /**
   * Get dataset by engine and type
   */
  async getDataset(
    databaseEngine: DatabaseEngines | null,
    datasetType: LogDatasetTypes
  ): Promise<string> {
    const dataset = await this.logDatasetRepository.findByEngineAndType(databaseEngine, datasetType)

    if (!dataset) {
      throw new Error(
        `No log dataset configured for type: ${datasetType}${databaseEngine ? ` and engine: ${databaseEngine}` : ''}`
      )
    }

    return dataset.datasetName
  }
}
