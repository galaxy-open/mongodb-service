import type { QuerySpec, BinaryOperation, Aggregation } from '#interfaces/prometheus'

export default class PrometheusQueryValidator {
  /**
   * Main validation entry point for QuerySpec
   */
  validate(spec: QuerySpec): void {
    this.validateMetric(spec.metric)
    this.validateComplexOperations(spec)
    this.validateAggregation(spec.aggregation)
    this.validateBinaryOperation(spec.binaryOp)
    this.validateDividedBy(spec.dividedBy)
    this.validateFunctions(spec.functions)
    this.validateLabels(spec.labels)
  }

  /**
   * Validate metric name
   */
  private validateMetric(metric: string): void {
    if (!metric) {
      throw new Error('Metric name is required')
    }

    if (typeof metric !== 'string' || metric.trim() === '') {
      throw new Error('Metric name must be a non-empty string')
    }

    // Validate metric name format (basic Prometheus naming convention)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(metric.replace(/:/g, '_'))) {
      console.warn(
        `Metric name "${metric}" may not follow Prometheus naming conventions. ` +
          'Consider using letters, numbers, underscores, and colons only.'
      )
    }
  }

  /**
   * Validate that only one complex operation is used at a time
   */
  private validateComplexOperations(spec: QuerySpec): void {
    const operations = [
      spec.dividedBy ? 'dividedBy' : null,
      spec.binaryOp ? 'binaryOp' : null,
      spec.mathExpression ? 'mathExpression' : null,
    ].filter(Boolean)

    if (operations.length > 1) {
      throw new Error(
        `Cannot use multiple complex operations in same query: ${operations.join(', ')}. ` +
          'Use nested QuerySpecs or separate queries instead.'
      )
    }
  }

  /**
   * Validate aggregation configuration
   */
  private validateAggregation(aggregation?: Aggregation): void {
    if (!aggregation) return

    const validFunctions = ['sum', 'avg', 'max', 'min', 'count', 'max_over_time']
    if (!validFunctions.includes(aggregation.func)) {
      throw new Error(
        `Invalid aggregation function: ${aggregation.func}. ` +
          `Valid functions: ${validFunctions.join(', ')}`
      )
    }

    if (aggregation.func.includes('over_time') && !aggregation.interval) {
      throw new Error(`${aggregation.func} requires interval (e.g., "1m", "5m")`)
    }

    if (!aggregation.func.includes('over_time') && aggregation.interval) {
      throw new Error(`Function ${aggregation.func} does not support interval parameter`)
    }

    if (aggregation.by && aggregation.without) {
      throw new Error('Cannot use both "by" and "without" clauses in same aggregation')
    }

    if (aggregation.by && aggregation.by.length === 0) {
      throw new Error('Aggregation "by" clause cannot be empty array')
    }

    if (aggregation.without && aggregation.without.length === 0) {
      throw new Error('Aggregation "without" clause cannot be empty array')
    }
  }

  /**
   * Validate binary operation configuration
   */
  private validateBinaryOperation(binaryOp?: BinaryOperation): void {
    if (!binaryOp) return

    const validOperators = ['*', '/', '+', '-']
    if (!validOperators.includes(binaryOp.operator)) {
      throw new Error(
        `Invalid binary operator: ${binaryOp.operator}. ` +
          `Valid operators: ${validOperators.join(', ')}`
      )
    }

    if (!binaryOp.rightQuery) {
      throw new Error('Binary operation requires rightQuery')
    }

    if (binaryOp.groupLeft && binaryOp.groupRight) {
      throw new Error('Cannot use both group_left and group_right in same binary operation')
    }

    if ((binaryOp.groupLeft || binaryOp.groupRight) && !binaryOp.on) {
      throw new Error('group_left/group_right requires "on" clause for vector matching')
    }

    if (binaryOp.on && binaryOp.on.length === 0) {
      throw new Error('Binary operation "on" clause cannot be empty array')
    }

    // Recursively validate the right query
    this.validate(binaryOp.rightQuery)
  }

  /**
   * Validate division operation
   */
  private validateDividedBy(dividedBy?: QuerySpec): void {
    if (!dividedBy) return

    if (!dividedBy.metric) {
      throw new Error('dividedBy query requires metric name')
    }

    // Recursively validate the divided by query
    this.validate(dividedBy)
  }

  /**
   * Validate Prometheus functions
   */
  private validateFunctions(functions?: string[]): void {
    if (!functions) return

    for (const func of functions) {
      if (!func.includes('()')) {
        throw new Error(
          `Invalid function format: ${func}. Functions must include parentheses (e.g., "rate()[1m]", "avg()")`
        )
      }

      // Validate rate function format
      if (func.startsWith('rate()') && !func.includes('[')) {
        throw new Error(`Rate function missing interval: ${func}. Use format "rate()[1m]"`)
      }

      // Validate known function names
      const funcName = func.split('()')[0]
      const knownFunctions = ['rate', 'avg', 'sum', 'max', 'min', 'count', 'increase', 'delta']

      if (!knownFunctions.some((known) => funcName.startsWith(known))) {
        console.warn(
          `Unknown function: ${funcName}. This may be intentional, but common functions are: ${knownFunctions.join(', ')}`
        )
      }
    }
  }

  /**
   * Validate Prometheus labels
   */
  private validateLabels(labels?: Record<string, string>): void {
    if (!labels) return

    for (const [key, value] of Object.entries(labels)) {
      if (typeof key !== 'string' || key.trim() === '') {
        throw new Error('Label keys must be non-empty strings')
      }

      if (typeof value !== 'string') {
        throw new Error(`Label value for key "${key}" must be a string`)
      }

      // Check for reserved label names
      const reservedLabels = ['__name__', '__address__', '__scheme__', '__metrics_path__']
      if (reservedLabels.includes(key)) {
        throw new Error(`Label key "${key}" is reserved by Prometheus`)
      }

      // Validate label name format (basic Prometheus naming convention)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key.replace(/!/g, ''))) {
        console.warn(
          `Label key "${key}" may not follow Prometheus naming conventions. ` +
            'Consider using letters, numbers, and underscores only.'
        )
      }

      // Check for empty label values (which may cause issues)
      if (value.trim() === '' && !value.includes('~')) {
        console.warn(`Label "${key}" has empty value. This may cause unexpected query behavior.`)
      }
    }
  }
}
