import { inject } from '@adonisjs/core'
import PrometheusQueryBuilder from '#services/monitoring/prometheus_query_builder'
import type DatabaseInstance from '#models/database_instance'
import type { MetricQuery } from '#interfaces/metrics'
import { DatabaseQueryInsightsConfig } from '#services/database_query_insights/configs/database_query_insights_config'

interface QueryInsightsProcessingRule {
  isAggregated: boolean
  aggregationKey: string
}

@inject()
export default class MongodbQueryInsightsConfig extends DatabaseQueryInsightsConfig {
  private readonly processingRules: Map<string, QueryInsightsProcessingRule> = new Map([
    ['duration', { isAggregated: false, aggregationKey: 'query_hash' }],
    ['indexEfficiency', { isAggregated: false, aggregationKey: 'query_hash' }],
    ['efficiency', { isAggregated: false, aggregationKey: 'query_hash' }],
    ['rate', { isAggregated: false, aggregationKey: 'query_hash' }],
    ['slowQueries', { isAggregated: false, aggregationKey: 'query_hash' }],
  ])

  constructor(private queryBuilder: PrometheusQueryBuilder) {
    super()
  }

  /**
   * Build all query insights queries for a MongoDB database instance
   */
  buildQueries(database: DatabaseInstance): MetricQuery[] {
    return [
      this.buildDurationQuery(database),
      this.buildIndexEfficiencyQuery(database),
      this.buildEfficiencyQuery(database),
      this.buildRateQuery(database),
      this.buildSlowQueriesQuery(database),
    ]
  }

  /**
   * Check if metric should be aggregated as total across instances
   */
  isAggregatedMetric(key: string): boolean {
    const rule = this.processingRules.get(key)
    return rule?.isAggregated ?? false
  }

  /**
   * Get the aggregation key for a specific metric
   */
  getMetricAggregationKey(key: string): string {
    const rule = this.processingRules.get(key)
    return rule?.aggregationKey ?? 'query_hash'
  }

  /**
   * Build query duration metric query
   */
  private buildDurationQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'duration',
      query: this.queryBuilder.buildQuery({
        metric: 'slow_queries_duration_total',
        labels: {
          job: '~"profiler-exporters"',
          service_name: `~"${database.stackName}"`,
        },
        functions: ['rate()[1m]'],
      }),
    }
  }

  /**
   * Build index efficiency metric query
   */
  private buildIndexEfficiencyQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'indexEfficiency',
      query: this.queryBuilder.buildQuery({
        metric: 'slow_queries_keys_examined_total',
        labels: {
          job: '~"profiler-exporters"',
          service_name: `~"${database.stackName}"`,
        },
        functions: ['rate()[1m]'],
        dividedBy: {
          metric: 'slow_queries_docs_examined_total',
          labels: {
            job: '~"profiler-exporters"',
            service_name: `~"${database.stackName}"`,
          },
          functions: ['rate()[1m]'],
        },
        filter: '< +Inf',
      }),
    }
  }

  /**
   * Build query efficiency metric query
   */
  private buildEfficiencyQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'efficiency',
      query: this.queryBuilder.buildQuery({
        metric: 'slow_queries_nreturned_total',
        labels: {
          job: '~"profiler-exporters"',
          service_name: `~"${database.stackName}"`,
        },
        functions: ['rate()[1m]'],
        dividedBy: {
          metric: 'slow_queries_docs_examined_total',
          labels: {
            job: '~"profiler-exporters"',
            service_name: `~"${database.stackName}"`,
          },
          functions: ['rate()[1m]'],
        },
        filter: '< +Inf',
      }),
    }
  }

  /**
   * Build query rate metric query
   */
  private buildRateQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'rate',
      query: this.queryBuilder.buildQuery({
        metric: 'slow_queries_count_total',
        labels: {
          job: '~"profiler-exporters"',
          service_name: `~"${database.stackName}"`,
        },
        functions: ['rate()[1m]'],
      }),
    }
  }

  /**
   * Build slow queries metric query with detailed information
   */
  private buildSlowQueriesQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'slowQueries',
      query: this.queryBuilder.buildQuery({
        metric: 'slow_queries_count_total',
        labels: {
          job: '~"profiler-exporters"',
          service_name: `~"${database.stackName}"`,
        },
        functions: ['rate()[1m]'],
        aggregation: {
          func: 'sum',
          by: ['query_hash', 'ns'],
        },
        binaryOp: {
          operator: '*',
          on: ['query_hash', 'ns'],
          groupLeft: ['op', 'plan_summary', 'query_framework', 'query_shape'],
          rightQuery: {
            metric: 'slow_queries_info',
            labels: {
              service_name: `~"${database.stackName}"`,
            },
            aggregation: {
              func: 'max_over_time',
              interval: '1m',
            },
          },
        },
      }),
    }
  }
}
