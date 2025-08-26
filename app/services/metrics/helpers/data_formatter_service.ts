import type { RechartsDataPoint } from '#interfaces/metrics'

export default class DataFormatterService {
  /**
   * Format memory data points from bytes to MB
   */
  formatMemoryData(dataPoints: RechartsDataPoint[]): RechartsDataPoint[] {
    return dataPoints.map((point) => ({
      ...point,
      ...Object.keys(point).reduce((formatted, key) => {
        if (key === 'date') {
          formatted[key] = point[key]
          return formatted
        }

        if (typeof point[key] === 'number' && point[key] !== null) {
          // Convert bytes to MB for better chart readability
          const bytes = point[key] as number
          formatted[key] = Number.parseFloat((bytes / (1024 * 1024)).toFixed(2))
          return formatted
        }

        formatted[key] = point[key]
        return formatted
      }, {} as RechartsDataPoint),
    }))
  }

  /**
   * Format disk data points from bytes to GB
   */
  formatDiskData(dataPoints: RechartsDataPoint[]): RechartsDataPoint[] {
    return dataPoints.map((point) => ({
      ...point,
      ...Object.keys(point).reduce((formatted, key) => {
        if (key === 'date') {
          formatted[key] = point[key]
          return formatted
        }

        if (typeof point[key] === 'number' && point[key] !== null) {
          // Convert bytes to GB for better chart readability
          const bytes = point[key] as number
          formatted[key] = Number.parseFloat((bytes / (1024 * 1024 * 1024)).toFixed(3))
          return formatted
        }

        formatted[key] = point[key]
        return formatted
      }, {} as RechartsDataPoint),
    }))
  }

  /**
   * Format network data points from bytes/sec to KB/sec or MB/sec
   */
  formatNetworkData(dataPoints: RechartsDataPoint[]): RechartsDataPoint[] {
    return dataPoints.map((point) => ({
      ...point,
      ...Object.keys(point).reduce((formatted, key) => {
        if (key === 'date') {
          formatted[key] = point[key]
          return formatted
        }

        if (typeof point[key] === 'number' && point[key] !== null) {
          // Convert bytes/sec to KB/sec for better readability
          const bytesPerSec = point[key] as number
          formatted[key] = Number.parseFloat((bytesPerSec / 1024).toFixed(2))
          return formatted
        }

        formatted[key] = point[key]
        return formatted
      }, {} as RechartsDataPoint),
    }))
  }

  /**
   * Format data based on metric type
   */
  formatMetricData(metricKey: string, data: RechartsDataPoint[]): RechartsDataPoint[] {
    switch (metricKey) {
      case 'memory_usage':
      case 'memory_limit':
        return this.formatMemoryData(data)

      case 'disk_usage':
      case 'disk_total':
        return this.formatDiskData(data)

      case 'network_in':
      case 'network_out':
        return this.formatNetworkData(data)

      case 'cpu':
        return this.formatCpuData(data)

      default:
        return data
    }
  }

  /**
   * Format CPU data from decimal to percentage
   */
  private formatCpuData(dataPoints: RechartsDataPoint[]): RechartsDataPoint[] {
    return dataPoints.map((point) => ({
      ...point,
      ...Object.keys(point).reduce((formatted, key) => {
        if (key === 'date') {
          formatted[key] = point[key]
          return formatted
        }

        if (typeof point[key] === 'number' && point[key] !== null) {
          // Convert decimal to percentage (0.5 -> 50%)
          const decimal = point[key] as number
          formatted[key] = Number.parseFloat((decimal * 100).toFixed(2))
          return formatted
        }

        formatted[key] = point[key]
        return formatted
      }, {} as RechartsDataPoint),
    }))
  }
}
