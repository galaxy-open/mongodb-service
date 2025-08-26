import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import type { LogQuery, LogResult } from '#interfaces/logs'
import AxiomClient from '#services/logs/axiom_client'
import LogsQueryBuilder from '#services/logs/logs_query_builder'
import LogsParser from '#services/logs/logs_parser'
import AxiomDatasetHelper from '#services/logs/helpers/get_axiom_dataset'
import type DatabaseEngines from '#enums/database_engines'

@inject()
export default class LogsService {
  constructor(
    private axiomClient: AxiomClient,
    private parser: LogsParser,
    private queryBuilder: LogsQueryBuilder,
    private axiomDatasetHelper: AxiomDatasetHelper
  ) {}

  async queryDatabaseLogs(databaseEngine: DatabaseEngines, query: LogQuery): Promise<LogResult> {
    const dataset = await this.axiomDatasetHelper.getForDatabase(databaseEngine)
    return this.queryLogs(dataset, query)
  }

  private async queryLogs(dataset: string, query: LogQuery): Promise<LogResult> {
    try {
      logger.debug(
        {
          dataset,
          stackName: query.stackName,
          region: query.region,
          limit: query.limit,
          hasTimeRange: !!(query.minDate || query.maxDate),
          stream: query.stream,
          hasCursor: !!query.cursorTimestamp,
        },
        'Starting log query'
      )

      // Convert string dates to DateTime objects
      const minDate = query.minDate ? DateTime.fromISO(query.minDate) : undefined
      const maxDate = query.maxDate ? DateTime.fromISO(query.maxDate) : undefined

      // Build Axiom APL query
      const apl = this.queryBuilder.buildDatabaseLogsQuery(dataset, {
        stackName: query.stackName,
        region: query.region,
        limit: query.limit,
        minDate,
        maxDate,
        stream: query.stream,
        cursorTimestamp: query.cursorTimestamp,
      })

      logger.debug({ apl }, 'Built APL query')

      // Execute query via Axiom client
      const response = await this.axiomClient.query({
        apl,
        startTime: minDate?.toISO() || undefined,
        endTime: query.cursorTimestamp || maxDate?.toISO() || undefined,
      })

      // Parse response to standard format
      const logs = this.parser.parseAxiomResponse(response)

      // Calculate next page timestamp for pagination
      const nextPageTimestamp = this.calculateNextPageTimestamp(logs, query.limit)

      const result: LogResult = {
        logs,
        totalItems: response.status?.rowsMatched || 0,
        nextPageTimestamp,
      }

      logger.debug(
        {
          stackName: query.stackName,
          logsReturned: logs.length,
          totalMatched: result.totalItems,
          hasNextPage: !!nextPageTimestamp,
        },
        'Log query completed'
      )

      return result
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : error,
          stackName: query.stackName,
          region: query.region,
        },
        'Failed to query logs'
      )

      if (error instanceof Error) {
        throw new Error(`Log query failed: ${error.message}`)
      }

      throw new Error('Log query failed: Unknown error')
    }
  }

  private calculateNextPageTimestamp(logs: any[], requestedLimit?: number): string | undefined {
    const limit = requestedLimit || 100

    if (logs.length > 0 && logs.length === limit) {
      const lastLog = logs[logs.length - 1]
      return lastLog.timestamp.toISO ? lastLog.timestamp.toISO() : lastLog.timestamp
    }

    return undefined
  }
}
