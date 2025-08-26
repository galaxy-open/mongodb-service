import LogDataset from '#models/log_dataset'
import DatabaseEngines from '#enums/database_engines'
import LogDatasetTypes from '#enums/log_dataset_types'

export default class LogDatasetRepository {
  /**
   * Find a log dataset by database engine and type
   */
  async findByEngineAndType(
    databaseEngine: DatabaseEngines | null,
    datasetType: LogDatasetTypes
  ): Promise<LogDataset | null> {
    const query = LogDataset.query()
      .where('dataset_type', datasetType)
      .where('is_active', true)
      .whereNull('deleted_at')

    if (databaseEngine) {
      query.where('database_engine', databaseEngine)
    } else {
      query.whereNull('database_engine')
    }

    return query.first()
  }

  /**
   * Find dataset for database logs
   */
  async findForDatabase(databaseEngine: DatabaseEngines): Promise<LogDataset | null> {
    return this.findByEngineAndType(databaseEngine, LogDatasetTypes.DATABASE)
  }

  /**
   * Get all active log datasets
   */
  async getAllActive(): Promise<LogDataset[]> {
    return LogDataset.query()
      .where('is_active', true)
      .whereNull('deleted_at')
      .orderBy('dataset_type')
      .orderBy('database_engine')
  }

  /**
   * Create a new log dataset
   */
  async create(data: {
    databaseEngine?: DatabaseEngines | null
    datasetType: LogDatasetTypes
    datasetName: string
    isActive?: boolean
  }): Promise<LogDataset> {
    return LogDataset.create({
      databaseEngine: data.databaseEngine || null,
      datasetType: data.datasetType,
      datasetName: data.datasetName,
      isActive: data.isActive ?? true,
    })
  }

  /**
   * Update a log dataset
   */
  async update(
    id: string,
    data: Partial<{
      datasetName: string
      isActive: boolean
    }>
  ): Promise<LogDataset> {
    const dataset = await LogDataset.findOrFail(id)
    dataset.merge(data)
    await dataset.save()
    return dataset
  }
}
