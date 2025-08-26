import { test } from '@japa/runner'
import PrometheusParser from '#services/monitoring/prometheus_parser'
import TimeRange from '#enums/time_range'
import type { PrometheusApiResponse } from '#interfaces/prometheus'

test.group('PrometheusParser | Unit', (group) => {
  let parser: PrometheusParser

  group.each.setup(() => {
    parser = new PrometheusParser()
  })

  test('should return empty array for null result', ({ assert }) => {
    const result = parser.parseTimeSeries({} as any)
    assert.deepEqual(result, [])
  })

  test('should parse single time series', ({ assert }) => {
    const apiResponse: PrometheusApiResponse = {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { instance: 'worker1', job: 'api' },
            values: [
              [1640995200, '0.5'],
              [1640995260, '0.7'],
            ],
          },
        ],
      },
    }

    const result = parser.parseTimeSeries(apiResponse)

    assert.deepEqual(result, [
      {
        metric: { instance: 'worker1', job: 'api' },
        values: [
          { timestamp: 1640995200000, value: 0.5 },
          { timestamp: 1640995260000, value: 0.7 },
        ],
      },
    ])
  })

  test('should handle multiple time series', ({ assert }) => {
    const apiResponse: PrometheusApiResponse = {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { instance: 'worker1' },
            values: [[1640995200, '0.5']],
          },
          {
            metric: { instance: 'worker2' },
            values: [[1640995200, '0.3']],
          },
        ],
      },
    }

    const result = parser.parseTimeSeries(apiResponse)

    assert.lengthOf(result, 2)
    assert.equal(result[0].metric.instance, 'worker1')
    assert.equal(result[1].metric.instance, 'worker2')
  })

  test('should convert single series to flat format', ({ assert }) => {
    const timeSeries = [
      {
        metric: { instance: 'worker1' },
        values: [
          { timestamp: 1640995200000, value: 0.5 },
          { timestamp: 1640995260000, value: 0.7 },
        ],
      },
    ]

    const result = parser.toFlatRechartsData(timeSeries, TimeRange.ONE_HOUR)

    assert.lengthOf(result, 2)
    assert.property(result[0], 'date')
    assert.property(result[0], 'worker1')
    assert.equal(result[0]['worker1'], 0.5)
    assert.equal(result[1]['worker1'], 0.7)
  })

  test('should handle different timestamps across series', ({ assert }) => {
    const timeSeries = [
      {
        metric: { instance: 'worker1' },
        values: [
          { timestamp: 1640995200000, value: 0.5 },
          { timestamp: 1640995260000, value: 0.7 },
        ],
      },
      {
        metric: { instance: 'worker2' },
        values: [{ timestamp: 1640995200000, value: 0.3 }],
      },
    ]

    const result = parser.toFlatRechartsData(timeSeries, TimeRange.ONE_HOUR)

    assert.lengthOf(result, 2)
    assert.equal(result[0]['worker1'], 0.5)
    assert.equal(result[0]['worker2'], 0.3)
    assert.equal(result[1]['worker1'], 0.7)
    assert.equal(result[1]['worker2'], null) // Missing value
  })

  test('should sum values across all series', ({ assert }) => {
    const timeSeries = [
      {
        metric: { instance: 'worker1' },
        values: [{ timestamp: 1640995200000, value: 0.5 }],
      },
      {
        metric: { instance: 'worker2' },
        values: [{ timestamp: 1640995200000, value: 0.3 }],
      },
    ]

    const result = parser.toTotalRechartsData(timeSeries, TimeRange.ONE_HOUR)

    assert.lengthOf(result, 1)
    assert.equal(result[0]['total'], 0.8) // 0.5 + 0.3
  })

  test('should return correct params for different time ranges', ({ assert }) => {
    const fiveMinResult = parser.getQueryParams(TimeRange.FIVE_MINUTES)
    assert.equal(fiveMinResult.step, '5s')
    assert.instanceOf(fiveMinResult.start, Date)
    assert.instanceOf(fiveMinResult.end, Date)

    const duration = fiveMinResult.end.getTime() - fiveMinResult.start.getTime()
    assert.approximately(duration, 5 * 60 * 1000, 1000) // Within 1 second tolerance

    const hourResult = parser.getQueryParams(TimeRange.ONE_HOUR)
    assert.equal(hourResult.step, '1m')

    const hourDuration = hourResult.end.getTime() - hourResult.start.getTime()
    assert.approximately(hourDuration, 60 * 60 * 1000, 1000) // 1 hour
  })
})
