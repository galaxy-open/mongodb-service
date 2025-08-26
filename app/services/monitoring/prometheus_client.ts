import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import type { PrometheusApiResponse } from '#interfaces/prometheus'

@inject()
export default class PrometheusClient {
  private readonly baseUrl: string
  private readonly headers: Record<string, string>

  constructor() {
    this.baseUrl = env.get('PROMETHEUS_URL')
    const username = env.get('PROMETHEUS_USERNAME')
    const password = env.get('PROMETHEUS_PASSWORD')

    this.headers = {
      'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
      'Content-Type': 'application/json',
    }
  }

  async query(promql: string): Promise<PrometheusApiResponse> {
    const url = new URL('/api/v1/query', this.baseUrl)
    url.searchParams.set('query', promql)

    return this.makeRequest(url)
  }

  async rangeQuery(
    promql: string,
    start: Date,
    end: Date,
    step: string
  ): Promise<PrometheusApiResponse> {
    const startTimestamp = Math.floor(start.getTime() / 1000)
    const endTimestamp = Math.floor(end.getTime() / 1000)

    const url = new URL('/api/v1/query_range', this.baseUrl)
    url.searchParams.set('query', promql)
    url.searchParams.set('start', startTimestamp.toString())
    url.searchParams.set('end', endTimestamp.toString())
    url.searchParams.set('step', step)

    return this.makeRequest(url)
  }

  private async makeRequest(url: URL): Promise<PrometheusApiResponse> {
    try {
      logger.debug('Making Prometheus request', { url: url.toString() })

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(
          {
            status: response.status,
            statusText: response.statusText,
            errorText,
          },
          'Prometheus API error'
        )
        throw new Error(
          `Prometheus API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const result = (await response.json()) as PrometheusApiResponse

      if (result.status !== 'success') {
        logger.error({ error: result.error }, 'Prometheus query failed')
        throw new Error(`Prometheus query failed: ${result.error || 'Unknown error'}`)
      }

      logger.debug('Prometheus request successful', {
        dataLength: result.data?.result?.length || 0,
      })
      return result
    } catch (error) {
      logger.error({ error: error.message }, 'Prometheus request failed')
      throw error
    }
  }
}
