import type TimeRange from '#enums/time_range'

export interface PrometheusDataPoint {
  timestamp: number
  value: number
}

export interface PrometheusTimeSeries {
  metric: Record<string, string>
  values: PrometheusDataPoint[]
}

export interface TimeRangeConfig {
  duration: number // in minutes
  step: string // Prometheus step
  dateFormat: string
}

export interface BinaryOperation {
  operator: '*' | '/' | '+' | '-'
  rightQuery: QuerySpec
  on?: string[]
  groupLeft?: string[]
  groupRight?: string[]
}

export interface Aggregation {
  func: 'sum' | 'avg' | 'max' | 'min' | 'count' | 'max_over_time'
  by?: string[]
  without?: string[]
  interval?: string // for max_over_time[1m]
}

export interface QuerySpec {
  metric: string
  labels?: Record<string, string>
  functions?: string[]
  mathExpression?: string
  dividedBy?: QuerySpec
  binaryOp?: BinaryOperation
  aggregation?: Aggregation
  filter?: string // e.g., "< +Inf"
}

/**
 * Raw Prometheus API response structure
 */
export interface PrometheusApiResponse {
  status: 'success' | 'error'
  data?: {
    resultType: 'matrix' | 'vector' | 'scalar' | 'string'
    result: Array<{
      metric: Record<string, string>
      values?: Array<[number, string]> // [timestamp, value]
      value?: [number, string] // For instant queries
    }>
  }
  error?: string
  errorType?: string
  warnings?: string[]
}

export type TimeRangeConfigs = Record<TimeRange, TimeRangeConfig>
