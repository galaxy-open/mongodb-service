import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import PrometheusClient from '#services/monitoring/prometheus_client'
import PrometheusParser from '#services/monitoring/prometheus_parser'
import DatabaseMetricsConfigRegistry from '#services/metrics/database_metrics_config_registry'
import DataFormatterService from '#services/metrics/helpers/data_formatter_service'
import TimeRange from '#enums/time_range'
import type DatabaseInstance from '#models/database_instance'
import type { DatabaseMetricsResult, RechartsDataPoint } from '#interfaces/metrics'
import { DatabaseMetricsConfig } from '#services/metrics/configs/database_metrics_config'

@inject()
export default class MetricsService {
  constructor(
    private prometheusClient: PrometheusClient,
    private parser: PrometheusParser,
    private configRegistry: DatabaseMetricsConfigRegistry,
    private formatter: DataFormatterService
  ) {}

  /**
   * Get all metrics for a database instance
   */
  async getAllDatabaseMetrics(
    database: DatabaseInstance,
    timeRange: TimeRange
  ): Promise<DatabaseMetricsResult> {
    const { start, end, step } = this.parser.getQueryParams(timeRange)
    const config = this.configRegistry.getConfig(database.databaseEngine)
    const queries = config.buildQueries(database)

    logger.info(
      {
        stackName: database.stackName,
        timeRange,
        queryCount: queries.length,
      },
      'Fetching database metrics'
    )

    const results = await Promise.all(
      queries.map(({ key, query }) =>
        this.executeQuery(key, query, start, end, step, timeRange, config)
      )
    )

    return Object.assign({ timeRange }, ...results) as DatabaseMetricsResult
  }

  /**
   * Execute a single metric query
   */
  private async executeQuery(
    key: string,
    query: string,
    start: Date,
    end: Date,
    step: string,
    timeRange: TimeRange,
    config: DatabaseMetricsConfig
  ): Promise<Partial<DatabaseMetricsResult>> {
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
        'Metric query successful'
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
    config: DatabaseMetricsConfig
  ): RechartsDataPoint[] {
    const timeSeries = this.parser.parseTimeSeries(result)
    const isAggregated = config.isAggregatedMetric(key)
    const aggregationKey = config.getMetricAggregationKey(key)

    if (isAggregated) {
      return this.parser.toTotalRechartsData(timeSeries, timeRange, aggregationKey)
    }

    return this.parser.toFlatRechartsData(timeSeries, timeRange, aggregationKey)
  }

  private handleQueryError(key: string, query: string, error: any): Partial<DatabaseMetricsResult> {
    logger.error({ key, query, error: error.message }, 'Metric query failed')
    return {
      [key]: [],
      [`${key}_error`]: error.message,
    }
  }
}
