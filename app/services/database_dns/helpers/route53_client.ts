import { inject } from '@adonisjs/core'
import {
  Route53Client as AWSRoute53Client,
  ChangeResourceRecordSetsCommand,
  ChangeResourceRecordSetsRequest,
  ChangeResourceRecordSetsResponse,
  waitUntilResourceRecordSetsChanged,
} from '@aws-sdk/client-route-53'
import route53Config from '#config/route53'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class Route53Client {
  private client: AWSRoute53Client
  private config: typeof route53Config

  constructor() {
    this.config = route53Config
    this.client = new AWSRoute53Client({
      region: this.config.aws.region,
      credentials: this.config.aws.credentials,
    })
  }

  async changeResourceRecordSets(
    params: ChangeResourceRecordSetsRequest
  ): Promise<ChangeResourceRecordSetsResponse> {
    return await this.retryOperation(async () => {
      const command = new ChangeResourceRecordSetsCommand(params)
      return await this.client.send(command)
    })
  }

  async waitForChange(changeId: string): Promise<void> {
    if (this.config.settings.waitForPropagation) {
      logger.info('Waiting for Route53 resource record sets change to propagate...')
      await waitUntilResourceRecordSetsChanged(
        { client: this.client, maxWaitTime: this.config.settings.propagationTimeout },
        { Id: changeId }
      )
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= this.config.settings.retryAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // Handle specific AWS errors
        switch (lastError.name) {
          case 'Throttling':
          case 'ThrottlingException':
            logger.warn('Route53 rate limit hit, retrying with exponential backoff', {
              attempt,
              error: lastError.message,
            })
            break
          case 'NoSuchHostedZone':
            logger.error(
              {
                error: lastError.message,
              },
              'Hosted zone not found, failing immediately'
            )
            throw lastError // Don't retry for this error
          case 'InvalidInput':
            logger.error(
              {
                error: lastError.message,
              },
              'Invalid DNS record format, failing immediately'
            )
            throw lastError // Don't retry for this error
          case 'InvalidChangeBatch':
            logger.error(
              {
                error: lastError.message,
              },
              'Invalid DNS change batch, failing immediately'
            )
            throw lastError // Don't retry for this error
        }

        if (attempt === this.config.settings.retryAttempts) {
          throw lastError
        }

        logger.warn(
          `Route53 operation failed, attempt ${attempt}/${this.config.settings.retryAttempts}`,
          {
            error: lastError.message,
            attempt,
          }
        )

        // Exponential backoff
        const delay = this.config.settings.retryDelay * Math.pow(2, attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }
}
