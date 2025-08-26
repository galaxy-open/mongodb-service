import type DatabaseInstance from '#models/database_instance'
import type { MetricQuery } from '#interfaces/metrics'

export abstract class DatabaseMetricsConfig {
  /**
   * Build all metric queries for a database instance
   */
  abstract buildQueries(database: DatabaseInstance): MetricQuery[]

  /**
   * Check if metric should be aggregated as total across instances
   */
  abstract isAggregatedMetric(key: string): boolean

  /**
   * Get the aggregation key for a specific metric
   */
  abstract getMetricAggregationKey(key: string): string
}
