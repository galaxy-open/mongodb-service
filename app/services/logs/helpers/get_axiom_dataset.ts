import { inject } from '@adonisjs/core'
import DatabaseEngines from '#enums/database_engines'
import LogDatasetService from '#services/logs/helpers/log_dataset_service'

/**
 * Helper class for getting Axiom dataset names
 */
@inject()
export default class AxiomDatasetHelper {
  constructor(private logDatasetService: LogDatasetService) {}

  async getForDatabase(databaseEngine: DatabaseEngines): Promise<string> {
    return this.logDatasetService.getDatasetForDatabase(databaseEngine)
  }
}
