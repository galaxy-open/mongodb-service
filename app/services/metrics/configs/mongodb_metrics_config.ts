import { inject } from '@adonisjs/core'
import PrometheusQueryBuilder from '#services/monitoring/prometheus_query_builder'
import type DatabaseInstance from '#models/database_instance'
import type { MetricQuery } from '#interfaces/metrics'
import { DatabaseMetricsConfig } from '#services/metrics/configs/database_metrics_config'

interface MetricProcessingRule {
  isAggregated: boolean
  aggregationKey: string
}

@inject()
export default class MongodbMetricsConfig extends DatabaseMetricsConfig {
  private readonly processingRules: Map<string, MetricProcessingRule> = new Map([
    ['cpu', { isAggregated: false, aggregationKey: 'instance' }],
    ['network_in', { isAggregated: false, aggregationKey: 'instance' }],
    ['network_out', { isAggregated: false, aggregationKey: 'instance' }],
    ['memory_usage', { isAggregated: false, aggregationKey: 'instance' }],
    ['memory_limit', { isAggregated: true, aggregationKey: 'total' }],
    ['disk_usage', { isAggregated: true, aggregationKey: 'usage' }],
    ['disk_total', { isAggregated: true, aggregationKey: 'total' }],
    ['connections', { isAggregated: true, aggregationKey: 'total' }],
  ])

  constructor(private queryBuilder: PrometheusQueryBuilder) {
    super()
  }

  /**
   * Build all metric queries for a MongoDB database instance
   */
  buildQueries(database: DatabaseInstance): MetricQuery[] {
    return [
      this.buildCpuQuery(database),
      this.buildNetworkInQuery(database),
      this.buildNetworkOutQuery(database),
      this.buildMemoryUsageQuery(database),
      this.buildMemoryLimitQuery(database),
      this.buildDiskUsageQuery(database),
      this.buildDiskTotalQuery(database),
      this.buildConnectionsQuery(database),
      ...this.buildOperationsQueries(database),
    ]
  }

  /**
   * Check if metric should be aggregated as total across instances
   */
  isAggregatedMetric(key: string): boolean {
    const rule = this.processingRules.get(key)
    if (rule) {
      return rule.isAggregated
    }

    // Operations are always aggregated
    if (key.startsWith('operations_')) {
      return true
    }

    // Default to per-instance (not aggregated) for unknown metrics
    return false
  }

  /**
   * Get the aggregation key for a specific metric
   */
  getMetricAggregationKey(key: string): string {
    const rule = this.processingRules.get(key)
    if (rule) {
      return rule.aggregationKey
    }

    // For operations, extract operation name
    if (key.startsWith('operations_')) {
      return key.replace('operations_', '')
    }

    return 'total'
  }

  /**
   * Build connections metric query
   */
  private buildConnectionsQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'connections',
      query: this.queryBuilder.buildQuery({
        metric: 'mongodb_ss_connections',
        labels: {
          conn_type: 'active',
          service_name: database.stackName,
        },
      }),
    }
  }

  /**
   * Build CPU usage metric query
   */
  private buildCpuQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'cpu',
      query: this.queryBuilder.buildQuery({
        metric: 'container_cpu_user_seconds_total',
        labels: this.getContainerLabels(database),
        functions: ['rate()[1m]'],
      }),
    }
  }

  /**
   * Build memory usage metric query
   */
  private buildMemoryUsageQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'memory_usage',
      query: this.queryBuilder.buildQuery({
        metric: 'container_memory_usage_bytes',
        labels: this.getContainerLabels(database),
      }),
    }
  }

  /**
   * Build memory limit metric query (stack-wide total)
   */
  private buildMemoryLimitQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'memory_limit',
      query: this.queryBuilder.buildQuery({
        metric: 'container_spec_memory_limit_bytes',
        labels: this.getContainerLabels(database),
      }),
    }
  }

  /**
   * Build disk usage metric query with avg aggregation
   */
  private buildDiskUsageQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'disk_usage',
      query: this.queryBuilder.buildQuery({
        metric: 'mongodb_dbstats_fsUsedSize',
        labels: {
          service_name: database.stackName,
        },
        functions: ['avg()'],
      }),
    }
  }

  /**
   * Build disk total metric query with avg aggregation
   */
  private buildDiskTotalQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'disk_total',
      query: this.queryBuilder.buildQuery({
        metric: 'mongodb_dbstats_fsTotalSize',
        labels: {
          service_name: database.stackName,
        },
        functions: ['avg()'],
      }),
    }
  }

  /**
   * Build network in metric query
   */
  private buildNetworkInQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'network_in',
      query: this.queryBuilder.buildQuery({
        metric: 'container_network_receive_bytes_total',
        labels: {
          job: 'cadvisor',
          interface: 'eth1',
          ...this.getContainerLabels(database),
        },
        functions: ['rate()[1m]'],
      }),
    }
  }

  /**
   * Build network out metric query
   */
  private buildNetworkOutQuery(database: DatabaseInstance): MetricQuery {
    return {
      key: 'network_out',
      query: this.queryBuilder.buildQuery({
        metric: 'container_network_transmit_bytes_total',
        labels: {
          interface: 'eth1',
          ...this.getContainerLabels(database),
        },
        functions: ['rate()[1m]'],
      }),
    }
  }

  /**
   * Build operations metric queries
   */
  private buildOperationsQueries(database: DatabaseInstance): MetricQuery[] {
    const operations = ['command', 'query', 'update', 'delete', 'getMore', 'insert']

    return operations.map((operation) => ({
      key: `operations_${operation}`,
      query: this.queryBuilder.buildQuery({
        metric: 'mongodb_ss_opcounters',
        labels: {
          legacy_op_type: operation,
          service_name: database.stackName,
        },
        functions: ['rate()[1m]'],
      }),
    }))
  }

  /**
   * Get common container labels for MongoDB queries
   */
  private getContainerLabels(database: DatabaseInstance): Record<string, string> {
    return {
      'container_label_com_docker_stack_namespace': database.stackName,
      'container_label_metric_source!': 'mongo-exporter',
    }
  }
}
