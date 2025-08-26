import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import Route53Manager from '#services/database_dns/helpers/route53_manager'
import DnsRecordConverter from '#services/database_dns/helpers/dns_record_converter'

export interface DnsRecordSpec {
  name: string
  type: string
  value: string
  ttl: number
}

@inject()
export default class DnsRecordService {
  constructor(
    private route53Manager: Route53Manager,
    private dnsRecordConverter: DnsRecordConverter
  ) {}

  async createRecords(hostedZoneId: string, records: DnsRecordSpec[]): Promise<void> {
    logger.info('Creating DNS records via DnsRecordService')

    const dnsRecords = this.dnsRecordConverter.specsToParams(records)

    await this.route53Manager.createRecords(hostedZoneId, dnsRecords)

    logger.info('DNS records created successfully via DnsRecordService')
  }

  async deleteRecords(hostedZoneId: string, records: DnsRecordSpec[]): Promise<void> {
    logger.info('Deleting DNS records via DnsRecordService')

    const dnsRecords = this.dnsRecordConverter.specsToParams(records)

    await this.route53Manager.deleteRecords(hostedZoneId, dnsRecords)

    logger.info('DNS records deleted successfully via DnsRecordService')
  }
}
