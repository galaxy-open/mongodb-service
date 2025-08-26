import { inject } from '@adonisjs/core'
import type { QuerySpec, BinaryOperation, Aggregation } from '#interfaces/prometheus'
import PrometheusQueryValidator from '#services/monitoring/prometheus_query_validator'

@inject()
export default class PrometheusQueryBuilder {
  constructor(private validator: PrometheusQueryValidator) {}

  buildQuery(spec: QuerySpec): string {
    this.validator.validate(spec)

    let query = this.buildBaseQuery(spec)

    // Apply complex operations in order
    query = this.applyAggregation(query, spec.aggregation)
    query = this.applyDivision(query, spec.dividedBy)
    query = this.applyBinaryOperation(query, spec.binaryOp)
    query = this.applyFilter(query, spec.filter)
    query = this.applyMathExpression(query, spec.mathExpression)

    return query
  }

  private buildBaseQuery(spec: QuerySpec): string {
    let query = spec.metric
    query = this.addLabels(query, spec.labels)
    query = this.applyFunctions(query, spec.functions)
    return query
  }

  private addLabels(query: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return query
    }

    const labelPairs = Object.entries(labels)
      .map(([key, value]) => {
        // Handle regex operators like key=~"regex" (value already contains the regex pattern with quotes)
        if (typeof value === 'string' && value.startsWith('~')) {
          return `${key}=${value}`
        }
        // Handle negative regex operators like key!~"regex"
        if (typeof value === 'string' && value.startsWith('!~')) {
          return `${key}${value}`
        }
        // Handle negative operators like key!="value"
        if (key.endsWith('!')) {
          const actualKey = key.slice(0, -1)
          return `${actualKey}!="${value}"`
        }
        return `${key}="${value}"`
      })
      .join(', ')

    return `${query}{${labelPairs}}`
  }

  private applyFunctions(query: string, functions?: string[]): string {
    if (!functions) {
      return query
    }

    return functions.reduce((currentQuery, func) => {
      return this.applyFunction(currentQuery, func)
    }, query)
  }

  private applyFunction(query: string, func: string): string {
    if (func.includes('rate()')) {
      return this.applyRateFunction(query, func)
    }

    if (func.includes('avg()')) {
      return `avg(${query})`
    }

    if (func.includes('by (')) {
      return func.replace('()', `(${query})`)
    }

    return func.replace('()', `(${query})`)
  }

  private applyRateFunction(query: string, func: string): string {
    const interval = func.match(/\[(.+)\]/)?.[1]
    return `rate(${query}[${interval}])`
  }

  private applyMathExpression(query: string, mathExpression?: string): string {
    if (!mathExpression) {
      return query
    }

    return `(${query})${mathExpression}`
  }

  private applyAggregation(query: string, aggregation?: Aggregation): string {
    if (!aggregation) {
      return query
    }

    let aggregatedQuery = `${aggregation.func}(${query})`

    // Handle interval for time-based functions like max_over_time
    if (aggregation.interval && aggregation.func.includes('over_time')) {
      aggregatedQuery = `${aggregation.func}(${query}[${aggregation.interval}])`
    }

    // Add by clause
    if (aggregation.by && aggregation.by.length > 0) {
      const byClause = aggregation.by.join(', ')
      aggregatedQuery = `${aggregatedQuery} by (${byClause})`
    }

    // Add without clause
    if (aggregation.without && aggregation.without.length > 0) {
      const withoutClause = aggregation.without.join(', ')
      aggregatedQuery = `${aggregatedQuery} without (${withoutClause})`
    }

    return aggregatedQuery
  }

  private applyDivision(query: string, dividedBy?: QuerySpec): string {
    if (!dividedBy) {
      return query
    }

    // Build the right side of the division
    const rightQuery = this.buildQuery(dividedBy)
    return `${query} / ${rightQuery}`
  }

  private applyBinaryOperation(query: string, binaryOp?: BinaryOperation): string {
    if (!binaryOp) {
      return query
    }

    // Build the right side of the binary operation
    const rightQuery = this.buildQuery(binaryOp.rightQuery)
    let result = `${query} ${binaryOp.operator} `

    // Handle join operations with on/group_left/group_right
    if (binaryOp.on) {
      const onClause = binaryOp.on.join(', ')
      result += `on (${onClause}) `
    }

    if (binaryOp.groupLeft) {
      const groupLeftClause = binaryOp.groupLeft.join(', ')
      result += `group_left(${groupLeftClause}) `
    }

    if (binaryOp.groupRight) {
      const groupRightClause = binaryOp.groupRight.join(', ')
      result += `group_right(${groupRightClause}) `
    }

    result += rightQuery

    return result
  }

  private applyFilter(query: string, filter?: string): string {
    if (!filter) {
      return query
    }

    return `${query} ${filter}`
  }
}
