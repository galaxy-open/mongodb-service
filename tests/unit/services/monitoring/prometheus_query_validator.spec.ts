import { test } from '@japa/runner'
import PrometheusQueryValidator from '#services/monitoring/prometheus_query_validator'

test.group('PrometheusQueryValidator | Unit', (group) => {
  let validator: PrometheusQueryValidator

  group.each.setup(() => {
    validator = new PrometheusQueryValidator()
  })

  test('should throw error when metric is missing', ({ assert }) => {
    assert.throws(() => validator.validate({} as any), 'Metric name is required')
  })

  test('should throw error when metric is empty string', ({ assert }) => {
    assert.throws(() => validator.validate({ metric: '' }), 'Metric name is required')
  })

  test('should accept valid metric names', ({ assert }) => {
    assert.doesNotThrow(() => validator.validate({ metric: 'cpu_usage' }))
    assert.doesNotThrow(() => validator.validate({ metric: 'http_requests_total' }))
  })

  test('should throw error when using multiple complex operations', ({ assert }) => {
    assert.throws(
      () =>
        validator.validate({
          metric: 'test',
          dividedBy: { metric: 'test2' },
          binaryOp: { operator: '*', rightQuery: { metric: 'test3' } },
        }),
      'Cannot use multiple complex operations in same query'
    )
  })

  test('should throw error for invalid aggregation function', ({ assert }) => {
    assert.throws(
      () =>
        validator.validate({
          metric: 'test',
          aggregation: { func: 'invalid' as any },
        }),
      'Invalid aggregation function: invalid'
    )
  })

  test('should throw error when max_over_time missing interval', ({ assert }) => {
    assert.throws(
      () =>
        validator.validate({
          metric: 'test',
          aggregation: { func: 'max_over_time' },
        }),
      'max_over_time requires interval'
    )
  })

  test('should accept valid aggregation', ({ assert }) => {
    assert.doesNotThrow(() =>
      validator.validate({
        metric: 'test',
        aggregation: { func: 'sum', by: ['instance', 'job'] },
      })
    )
  })

  test('should throw error for invalid binary operator', ({ assert }) => {
    assert.throws(
      () =>
        validator.validate({
          metric: 'test',
          binaryOp: { operator: '%' as any, rightQuery: { metric: 'test2' } },
        }),
      'Invalid binary operator: %'
    )
  })

  test('should throw error when rightQuery is missing', ({ assert }) => {
    assert.throws(
      () =>
        validator.validate({
          metric: 'test',
          binaryOp: { operator: '*' } as any,
        }),
      'Binary operation requires rightQuery'
    )
  })

  test('should accept valid binary operation', ({ assert }) => {
    assert.doesNotThrow(() =>
      validator.validate({
        metric: 'test',
        binaryOp: {
          operator: '*',
          rightQuery: { metric: 'test2' },
          on: ['instance'],
          groupLeft: ['job', 'env'],
        },
      })
    )
  })

  test('should throw error when dividedBy missing metric', ({ assert }) => {
    assert.throws(
      () =>
        validator.validate({
          metric: 'test',
          dividedBy: {} as any,
        }),
      'dividedBy query requires metric name'
    )
  })

  test('should throw error for function without parentheses', ({ assert }) => {
    assert.throws(
      () =>
        validator.validate({
          metric: 'test',
          functions: ['rate'],
        }),
      'Invalid function format: rate'
    )
  })

  test('should throw error for rate without interval', ({ assert }) => {
    assert.throws(
      () =>
        validator.validate({
          metric: 'test',
          functions: ['rate()'],
        }),
      'Rate function missing interval'
    )
  })

  test('should accept valid functions', ({ assert }) => {
    assert.doesNotThrow(() =>
      validator.validate({
        metric: 'test',
        functions: ['rate()[1m]', 'avg()', 'sum()'],
      })
    )
  })

  test('should throw error for reserved label names', ({ assert }) => {
    assert.throws(
      () =>
        validator.validate({
          metric: 'test',
          labels: { __name__: 'value' },
        }),
      'Label key "__name__" is reserved by Prometheus'
    )
  })

  test('should accept valid labels', ({ assert }) => {
    assert.doesNotThrow(() =>
      validator.validate({
        metric: 'test',
        labels: {
          job: 'api',
          instance: 'localhost:9090',
        },
      })
    )
  })

  test('should validate complex nested query', ({ assert }) => {
    const complexQuery = {
      metric: 'slow_queries_count_total',
      labels: { job: '~"profiler-exporters"' },
      functions: ['rate()[1m]'],
      aggregation: { func: 'sum' as const, by: ['query_hash', 'ns'] },
      binaryOp: {
        operator: '*' as const,
        on: ['query_hash', 'ns'],
        groupLeft: ['op', 'plan_summary'],
        rightQuery: {
          metric: 'slow_queries_info',
          labels: { service_name: 'test-stack' },
          aggregation: { func: 'max_over_time' as const, interval: '1m' },
        },
      },
    }

    assert.doesNotThrow(() => validator.validate(complexQuery))
  })

  test('should validate efficiency query pattern', ({ assert }) => {
    const efficiencyQuery = {
      metric: 'slow_queries_nreturned_total',
      labels: { job: '~"profiler-exporters"' },
      functions: ['rate()[1m]'],
      dividedBy: {
        metric: 'slow_queries_docs_examined_total',
        labels: { job: '~"profiler-exporters"' },
        functions: ['rate()[1m]'],
      },
      filter: '< +Inf',
    }

    assert.doesNotThrow(() => validator.validate(efficiencyQuery))
  })
})
