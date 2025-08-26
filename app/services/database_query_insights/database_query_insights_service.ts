import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import PrometheusClient from '#services/monitoring/prometheus_client'
import PrometheusParser from '#services/monitoring/prometheus_parser'
import DatabaseQueryInsightsConfigRegistry from '#services/database_query_insights/database_query_insights_config_registry'
import DataFormatterService from '#services/metrics/helpers/data_formatter_service'
import TimeRange from '#enums/time_range'
import type DatabaseInstance from '#models/database_instance'
import type { RechartsDataPoint } from '#interfaces/metrics'
import { DatabaseQueryInsightsConfig } from '#services/database_query_insights/configs/database_query_insights_config'

export interface DatabaseQueryInsightsResult {
  timeRange: TimeRange
  duration?: RechartsDataPoint[]
  duration_error?: string
  indexEfficiency?: RechartsDataPoint[]
  indexEfficiency_error?: string
  efficiency?: RechartsDataPoint[]
  efficiency_error?: string
  rate?: RechartsDataPoint[]
  rate_error?: string
  slowQueries?: RechartsDataPoint[]
  slowQueries_error?: string
}

@inject()
export default class DatabaseQueryInsightsService {
  constructor(
    private prometheusClient: PrometheusClient,
    private parser: PrometheusParser,
    private configRegistry: DatabaseQueryInsightsConfigRegistry,
    private formatter: DataFormatterService
  ) {}

  /**
   * Get all query insights for a database instance
   */
  async getAllQueryInsights(
    database: DatabaseInstance,
    timeRange: TimeRange
  ): Promise<DatabaseQueryInsightsResult> {
    const { start, end, step } = this.parser.getQueryParams(timeRange)
    const config = this.configRegistry.getConfig(database.databaseEngine)
    const queries = config.buildQueries(database)

    logger.info(
      {
        stackName: database.stackName,
        timeRange,
        queryCount: queries.length,
      },
      'Fetching database query insights'
    )

    const results = await Promise.all(
      queries.map(({ key, query }) =>
        this.executeQuery(key, query, start, end, step, timeRange, config)
      )
    )

    return Object.assign({ timeRange }, ...results) as DatabaseQueryInsightsResult
  }

  /**
   * Execute a single query insights query
   */
  private async executeQuery(
    key: string,
    query: string,
    start: Date,
    end: Date,
    step: string,
    timeRange: TimeRange,
    config: DatabaseQueryInsightsConfig
  ): Promise<Partial<DatabaseQueryInsightsResult>> {
    try {
      const result = await this.prometheusClient.rangeQuery(query, start, end, step)
      const rawChartData = this.processQueryResult(result, timeRange, key, config)

      const formattedChartData = this.formatter.formatMetricData(key, rawChartData)

      logger.debug(
        {
          key,
          dataPoints: Array.isArray(formattedChartData)
            ? formattedChartData.length
            : Object.keys(formattedChartData).length,
        },
        'Query insights query successful'
      )
      return { [key]: formattedChartData }
    } catch (error) {
      return this.handleQueryError(key, query, error)
    }
  }

  private processQueryResult(
    result: any,
    timeRange: TimeRange,
    key: string,
    config: DatabaseQueryInsightsConfig
  ): RechartsDataPoint[] {
    const timeSeries = this.parser.parseTimeSeries(result)
    const isAggregated = config.isAggregatedMetric(key)
    const aggregationKey = config.getMetricAggregationKey(key)

    if (isAggregated) {
      return this.parser.toTotalRechartsData(timeSeries, timeRange, aggregationKey)
    }

    return this.parser.toFlatRechartsData(timeSeries, timeRange, aggregationKey)
  }

  private handleQueryError(
    key: string,
    query: string,
    error: any
  ): Partial<DatabaseQueryInsightsResult> {
    logger.error({ key, query, error: error.message }, 'Query insights query failed')
    return {
      [key]: [],
      [`${key}_error`]: error.message,
    }
  }
}
