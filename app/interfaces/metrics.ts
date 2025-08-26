import type TimeRange from '#enums/time_range'

export interface MetricQuery {
  key: string
  query: string
}

/**
 * A single data point in a Recharts-compatible format
 */
export interface RechartsDataPoint {
  date: string // Formatted date string
  [metricInstance: string]: string | number | null // Instance name -> metric value
}

/**
 * Complete metrics response for a database instance
 */
export interface DatabaseMetricsResult {
  timeRange: TimeRange
  cpu?: RechartsDataPoint[]
  cpu_error?: string
  network_in?: RechartsDataPoint[]
  network_in_error?: string
  network_out?: RechartsDataPoint[]
  network_out_error?: string
  memory_usage?: RechartsDataPoint[]
  memory_usage_error?: string
  memory_limit?: RechartsDataPoint[]
  memory_limit_error?: string
  disk_usage?: RechartsDataPoint[]
  disk_usage_error?: string
  disk_total?: RechartsDataPoint[]
  disk_total_error?: string
  connections?: RechartsDataPoint[]
  connections_error?: string
  operations_command?: RechartsDataPoint[]
  operations_command_error?: string
  operations_query?: RechartsDataPoint[]
  operations_query_error?: string
  operations_update?: RechartsDataPoint[]
  operations_update_error?: string
  operations_delete?: RechartsDataPoint[]
  operations_delete_error?: string
  operations_getMore?: RechartsDataPoint[]
  operations_getMore_error?: string
  operations_insert?: RechartsDataPoint[]
  operations_insert_error?: string
}
