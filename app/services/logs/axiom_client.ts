import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import type { AxiomApiResponse, AxiomQueryParams } from '#interfaces/axiom'

@inject()
export default class AxiomClient {
  private readonly baseUrl: string
  private readonly token: string
  private readonly headers: Record<string, string>

  constructor() {
    this.baseUrl = env.get('AXIOM_API_URL', 'https://api.axiom.co/v1/datasets/_apl')
    this.token = env.get('AXIOM_TOKEN')

    this.headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }
  }

  async query(queryParams: AxiomQueryParams): Promise<AxiomApiResponse> {
    const url = `${this.baseUrl}?format=tabular`

    return this.makeRequest(url, queryParams)
  }

  private async makeRequest(url: string, body: AxiomQueryParams): Promise<AxiomApiResponse> {
    try {
      logger.debug(
        {
          url,
          apl: body.apl.substring(0, 150) + '...',
          startTime: body.startTime,
          endTime: body.endTime,
        },
        'Making Axiom request'
      )

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(
          {
            status: response.status,
            statusText: response.statusText,
            errorText,
          },
          'Axiom API error'
        )
        throw new Error(`Axiom API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = (await response.json()) as AxiomApiResponse

      if (!result.status) {
        logger.error({ result }, 'Axiom query failed - no status in response')
        throw new Error('Axiom query failed: Invalid response format')
      }

      logger.debug(
        {
          rowsMatched: result.status?.rowsMatched || 0,
          rowsExamined: result.status?.rowsExamined || 0,
          elapsedTime: result.status?.elapsedTime || 0,
        },
        'Axiom request successful'
      )

      return result
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error },
        'Axiom request failed'
      )
      throw error
    }
  }
}
