import { inject } from '@adonisjs/core'
import { DnsRecordParams } from '#services/database_dns/dns_types'
import { DnsRecordSpec } from '#services/database_dns/dns_record_service'
import DatabaseDnsRecord from '#models/database_dns_record'
import DnsRecordTypes from '#enums/dns_record_types'

/**
 * Utility service for converting between different DNS record formats.
 * Eliminates duplication of conversion logic across DNS services.
 */
@inject()
export default class DnsRecordConverter {
  /**
   * Convert database DNS records to DnsRecordSpec format for API operations.
   */
  databaseRecordsToSpecs(records: DatabaseDnsRecord[]): DnsRecordSpec[] {
    return records.map((record) => ({
      name: record.recordName,
      type: record.recordType,
      value: record.recordValue,
      ttl: record.ttl,
    }))
  }

  /**
   * Convert DnsRecordParams to DnsRecordSpec format.
   */
  paramsToSpecs(records: DnsRecordParams[]): DnsRecordSpec[] {
    return records.map((record) => ({
      name: record.recordName,
      type: record.recordType,
      value: record.recordValue,
      ttl: record.ttl,
    }))
  }

  /**
   * Convert DnsRecordSpec to DnsRecordParams format.
   */
  specsToParams(records: DnsRecordSpec[]): DnsRecordParams[] {
    return records.map((record) => ({
      recordName: record.name,
      recordType: record.type as DnsRecordTypes,
      recordValue: record.value,
      ttl: record.ttl,
    }))
  }
}
