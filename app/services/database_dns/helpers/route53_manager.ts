import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DnsRecordParams } from '#services/database_dns/dns_types'
import Route53Client from '#services/database_dns/helpers/route53_client'

@inject()
export default class Route53Manager {
  constructor(private route53Client: Route53Client) {}

  async createRecords(hostedZoneId: string, records: DnsRecordParams[]): Promise<void> {
    logger.info('Creating DNS records in Route53 using UPSERT')

    try {
      await this.executeRoute53Changes(hostedZoneId, records, 'UPSERT')

      logger.info('DNS records upserted successfully')
    } catch (error) {
      logger.error(
        {
          hostedZoneId,
          error: (error as Error).message,
        },
        'Failed to upsert DNS records, attempting cleanup'
      )

      // If UPSERT fails, try to clean up any existing conflicting records
      try {
        await this.cleanupConflictingRecords(hostedZoneId, records)
        // Retry the UPSERT after cleanup
        await this.executeRoute53Changes(hostedZoneId, records, 'UPSERT')

        logger.info('DNS records created successfully after cleanup')
      } catch (cleanupError) {
        logger.error(
          {
            hostedZoneId,
            originalError: (error as Error).message,
            cleanupError: (cleanupError as Error).message,
          },
          'Cleanup and retry failed'
        )
        throw error
      }
    }
  }

  async deleteRecords(hostedZoneId: string, records: DnsRecordParams[]): Promise<void> {
    logger.info('Deleting DNS records from Route53')

    await this.executeRoute53Changes(hostedZoneId, records, 'DELETE')

    logger.info('DNS records deleted successfully')
  }

  private async cleanupConflictingRecords(
    hostedZoneId: string,
    records: DnsRecordParams[]
  ): Promise<void> {
    logger.info('Attempting to cleanup conflicting DNS records')

    try {
      // Try to delete existing records that might conflict
      await this.executeRoute53Changes(hostedZoneId, records, 'DELETE')
      logger.info({ hostedZoneId }, 'Conflicting records cleaned up successfully')
    } catch (error) {
      // If delete fails, it might be because the records don't exist, which is fine
      logger.warn(
        {
          hostedZoneId,
          error: (error as Error).message,
        },
        'Cleanup delete operation failed (records may not exist)'
      )
    }
  }

  private async executeRoute53Changes(
    hostedZoneId: string,
    records: DnsRecordParams[],
    action: 'CREATE' | 'DELETE' | 'UPSERT'
  ): Promise<void> {
    const changeBatch = {
      Changes: records.map((record) => ({
        Action: action,
        ResourceRecordSet: {
          Name: record.recordName,
          Type: record.recordType,
          TTL: record.ttl,
          ResourceRecords: [{ Value: record.recordValue }],
        },
      })),
    }

    logger.info('Executing Route53 changes')

    const result = await this.route53Client.changeResourceRecordSets({
      HostedZoneId: hostedZoneId,
      ChangeBatch: changeBatch,
    })

    logger.info('Route53 changes submitted')

    if (result.ChangeInfo?.Id) {
      await this.route53Client.waitForChange(result.ChangeInfo.Id)

      logger.info('Route53 changes propagated')
    }
  }
}
