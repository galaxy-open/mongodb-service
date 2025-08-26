import { test } from '@japa/runner'
import sinon from 'sinon'
import PrometheusQueryBuilder from '#services/monitoring/prometheus_query_builder'
import PrometheusQueryValidator from '#services/monitoring/prometheus_query_validator'

test.group('PrometheusQueryBuilder | Unit', (group) => {
  let queryBuilder: PrometheusQueryBuilder
  let validatorStub: sinon.SinonStubbedInstance<PrometheusQueryValidator>

  group.each.setup(() => {
    validatorStub = sinon.createStubInstance(PrometheusQueryValidator)
    queryBuilder = new PrometheusQueryBuilder(validatorStub as any)
  })

  group.each.teardown(() => {
    sinon.restore()
  })

  test('should build simple metric query', ({ assert }) => {
    const result = queryBuilder.buildQuery({ metric: 'cpu_usage' })

    assert.equal(result, 'cpu_usage')
    assert.isTrue(validatorStub.validate.calledOnce)
  })

  test('should build query with labels', ({ assert }) => {
    const result = queryBuilder.buildQuery({
      metric: 'cpu_usage',
      labels: { instance: 'worker1', job: 'api' },
    })

    assert.equal(result, 'cpu_usage{instance="worker1", job="api"}')
  })

  test('should handle negation labels', ({ assert }) => {
    const result = queryBuilder.buildQuery({
      metric: 'cpu_usage',
      labels: { 'job!': 'test', 'instance': 'worker1' },
    })

    assert.equal(result, 'cpu_usage{job!="test", instance="worker1"}')
  })

  test('should build query with functions', ({ assert }) => {
    const result = queryBuilder.buildQuery({
      metric: 'cpu_usage',
      functions: ['rate()[1m]'],
    })

    assert.equal(result, 'rate(cpu_usage[1m])')
  })

  test('should apply simple aggregation', ({ assert }) => {
    const result = queryBuilder.buildQuery({
      metric: 'cpu_usage',
      aggregation: { func: 'sum', by: ['instance', 'job'] },
    })

    assert.equal(result, 'sum(cpu_usage) by (instance, job)')
  })

  test('should build simple division query', ({ assert }) => {
    const result = queryBuilder.buildQuery({
      metric: 'metric_a',
      dividedBy: { metric: 'metric_b' },
    })

    assert.equal(result, 'metric_a / metric_b')
  })

  test('should build division with functions', ({ assert }) => {
    const result = queryBuilder.buildQuery({
      metric: 'metric_a',
      functions: ['rate()[1m]'],
      dividedBy: {
        metric: 'metric_b',
        functions: ['rate()[1m]'],
      },
    })

    assert.equal(result, 'rate(metric_a[1m]) / rate(metric_b[1m])')
  })

  test('should build simple binary operation', ({ assert }) => {
    const result = queryBuilder.buildQuery({
      metric: 'metric_a',
      binaryOp: {
        operator: '*',
        rightQuery: { metric: 'metric_b' },
      },
    })

    assert.equal(result, 'metric_a * metric_b')
  })

  test('should build binary operation with group_left', ({ assert }) => {
    const result = queryBuilder.buildQuery({
      metric: 'metric_a',
      binaryOp: {
        operator: '*',
        on: ['query_hash'],
        groupLeft: ['op', 'plan_summary'],
        rightQuery: { metric: 'metric_b' },
      },
    })

    assert.equal(result, 'metric_a * on (query_hash) group_left(op, plan_summary) metric_b')
  })

  test('should build MongoDB efficiency query', ({ assert }) => {
    const result = queryBuilder.buildQuery({
      metric: 'slow_queries_nreturned_total',
      labels: { job: '~"profiler-exporters"', service_name: '~"test-stack"' },
      functions: ['rate()[1m]'],
      dividedBy: {
        metric: 'slow_queries_docs_examined_total',
        labels: { job: '~"profiler-exporters"', service_name: '~"test-stack"' },
        functions: ['rate()[1m]'],
      },
      filter: '< +Inf',
    })

    const expected =
      'rate(slow_queries_nreturned_total{job=~"profiler-exporters", service_name=~"test-stack"}[1m]) / rate(slow_queries_docs_examined_total{job=~"profiler-exporters", service_name=~"test-stack"}[1m]) < +Inf'
    assert.equal(result, expected)
  })

  test('should call validator before building query', ({ assert }) => {
    const spec = { metric: 'test_metric' }
    queryBuilder.buildQuery(spec)

    assert.isTrue(validatorStub.validate.calledOnceWith(spec))
  })

  test('should propagate validation errors', ({ assert }) => {
    validatorStub.validate.throws(new Error('Invalid metric'))

    assert.throws(() => queryBuilder.buildQuery({ metric: 'test' }), 'Invalid metric')
  })
})
