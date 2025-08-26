import { DateTime } from 'luxon'
import TimeRange from '#enums/time_range'
import type {
  PrometheusTimeSeries,
  TimeRangeConfigs,
  PrometheusApiResponse,
} from '#interfaces/prometheus'
import type { RechartsDataPoint } from '#interfaces/metrics'

export default class PrometheusParser {
  private readonly timeRangeConfigs: TimeRangeConfigs = {
    [TimeRange.FIVE_MINUTES]: { duration: 5, step: '5s', dateFormat: 'HH:mm:ss' },
    [TimeRange.FIFTEEN_MINUTES]: { duration: 15, step: '15s', dateFormat: 'HH:mm:ss' },
    [TimeRange.THIRTY_MINUTES]: { duration: 30, step: '30s', dateFormat: 'HH:mm:ss' },
    [TimeRange.ONE_HOUR]: { duration: 60, step: '1m', dateFormat: 'HH:mm' },
    [TimeRange.THREE_HOURS]: { duration: 180, step: '3m', dateFormat: 'HH:mm' },
    [TimeRange.SIX_HOURS]: { duration: 360, step: '6m', dateFormat: 'HH:mm' },
    [TimeRange.TWELVE_HOURS]: { duration: 720, step: '12m', dateFormat: 'HH:mm' },
    [TimeRange.TWENTY_FOUR_HOURS]: { duration: 1440, step: '24m', dateFormat: 'HH:mm' },
    [TimeRange.TWO_DAYS]: { duration: 2880, step: '48m', dateFormat: 'MMM dd HH:mm' },
    [TimeRange.SEVEN_DAYS]: { duration: 10080, step: '2h48m', dateFormat: 'MMM dd' },
    [TimeRange.THIRTY_DAYS]: { duration: 43200, step: '12h', dateFormat: 'MMM dd' },
  }

  parseTimeSeries(result: PrometheusApiResponse): PrometheusTimeSeries[] {
    if (!result?.data?.result) {
      return []
    }

    return result.data.result.map((series) => ({
      metric: series.metric || {},
      values: (series.values || []).map(([timestamp, value]) => ({
        timestamp: timestamp * 1000, // Convert to milliseconds
        value: Number.parseFloat(value),
      })),
    }))
  }

  /**
   * Convert Prometheus time series to flat Recharts data format
   * Returns format: [{ date: "17:45:28", "worker-1": 0.003, "worker-3": 0.0015 }]
   */
  toFlatRechartsData(
    timeSeries: PrometheusTimeSeries[],
    timeRange: TimeRange,
    labelKey: string = 'instance'
  ): RechartsDataPoint[] {
    if (timeSeries.length === 0) {
      return []
    }

    const config = this.timeRangeConfigs[timeRange]
    const timestampSet = new Set<number>()

    // Collect all timestamps from all series
    timeSeries.forEach((series) => {
      series.values.forEach((point) => timestampSet.add(point.timestamp))
    })

    const timestamps = Array.from(timestampSet).sort((a, b) => a - b)

    return timestamps.map((timestamp): RechartsDataPoint => {
      const dataPoint: RechartsDataPoint = {
        date: DateTime.fromMillis(timestamp).toFormat(config.dateFormat),
      }

      timeSeries.forEach((series) => {
        const instanceName = series.metric[labelKey]
        if (!instanceName) return

        // Extract clean worker name (e.g., "worker-1" from "worker1.stack.local")
        const cleanWorkerName = instanceName.split('.')[0]

        const point = series.values.find((p) => p.timestamp === timestamp)
        dataPoint[cleanWorkerName] = point?.value || null
      })

      return dataPoint
    })
  }

  /**
   * Convert Prometheus time series to total Recharts data format
   * Returns format: [{ date: "17:45:28", "total": 1024 }]
   * Sums all values across instances for each timestamp
   */
  toTotalRechartsData(
    timeSeries: PrometheusTimeSeries[],
    timeRange: TimeRange,
    keyName: string = 'total'
  ): RechartsDataPoint[] {
    if (timeSeries.length === 0) {
      return []
    }

    const config = this.timeRangeConfigs[timeRange]
    const timestampSet = new Set<number>()

    // Collect all timestamps from all series
    timeSeries.forEach((series) => {
      series.values.forEach((point) => timestampSet.add(point.timestamp))
    })

    const timestamps = Array.from(timestampSet).sort((a, b) => a - b)

    return timestamps.map((timestamp): RechartsDataPoint => {
      const dataPoint: RechartsDataPoint = {
        date: DateTime.fromMillis(timestamp).toFormat(config.dateFormat),
      }

      // Sum all values for this timestamp across all instances
      let totalValue = 0
      timeSeries.forEach((series) => {
        const point = series.values.find((p) => p.timestamp === timestamp)
        if (point?.value) {
          totalValue += point.value
        }
      })

      dataPoint[keyName] = totalValue

      return dataPoint
    })
  }

  getQueryParams(timeRange: TimeRange) {
    const config = this.timeRangeConfigs[timeRange]
    const now = DateTime.now()
    const start = now.minus({ minutes: config.duration })

    return {
      start: start.toJSDate(),
      end: now.toJSDate(),
      step: config.step,
    }
  }
}
