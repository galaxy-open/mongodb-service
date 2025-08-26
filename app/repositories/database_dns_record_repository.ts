import DatabaseDnsRecord from '#models/database_dns_record'
import DnsRecordStatus from '#enums/dns_record_status'

export default class DatabaseDnsRecordRepository {
  /**
   * Find DNS records by stack name
   */
  async findByStackName(stackName: string): Promise<DatabaseDnsRecord[]> {
    return DatabaseDnsRecord.query().where('stack_name', stackName).orderBy('created_at', 'desc')
  }

  /**
   * Find DNS records by DNS zone ID
   */
  async findByDnsZoneId(dnsZoneId: string): Promise<DatabaseDnsRecord[]> {
    return DatabaseDnsRecord.query()
      .where('database_dns_zone_id', dnsZoneId)
      .orderBy('created_at', 'desc')
  }

  /**
   * Find DNS records by status
   */
  async findByStatus(status: DnsRecordStatus): Promise<DatabaseDnsRecord[]> {
    return DatabaseDnsRecord.query().where('status', status).orderBy('created_at', 'desc')
  }

  /**
   * Find DNS record by record name
   */
  async findByRecordName(recordName: string): Promise<DatabaseDnsRecord> {
    const dnsRecord = await DatabaseDnsRecord.query().where('record_name', recordName).first()
    if (!dnsRecord) {
      throw new Error(`DNS record with record name ${recordName} not found`)
    }
    return dnsRecord
  }

  /**
   * Find all DNS records by stack name and DNS zone ID
   */
  async findByStackNameAndDnsZoneId(
    stackName: string,
    dnsZoneId: string
  ): Promise<DatabaseDnsRecord[]> {
    return DatabaseDnsRecord.query()
      .where('stack_name', stackName)
      .where('database_dns_zone_id', dnsZoneId)
      .orderBy('created_at', 'desc')
  }

  /**
   * Find DNS record by ID
   */
  async findById(id: string): Promise<DatabaseDnsRecord> {
    return DatabaseDnsRecord.findOrFail(id)
  }

  /**
   * Create a new DNS record
   */
  async create(data: Partial<DatabaseDnsRecord>): Promise<DatabaseDnsRecord> {
    return DatabaseDnsRecord.create(data)
  }

  /**
   * Create multiple DNS records
   */
  async createMany(records: Partial<DatabaseDnsRecord>[]): Promise<DatabaseDnsRecord[]> {
    return DatabaseDnsRecord.createMany(records)
  }

  /**
   * Update DNS record
   */
  async update(id: string, data: Partial<DatabaseDnsRecord>): Promise<DatabaseDnsRecord> {
    const record = await DatabaseDnsRecord.findOrFail(id)
    return record.merge(data).save()
  }

  /**
   * Update DNS record status
   */
  async updateStatus(id: string, status: DnsRecordStatus): Promise<DatabaseDnsRecord> {
    const record = await DatabaseDnsRecord.findOrFail(id)
    return record.merge({ status }).save()
  }

  /**
   * Delete DNS record
   */
  async delete(id: string): Promise<void> {
    const record = await DatabaseDnsRecord.findOrFail(id)
    await record.delete()
  }

  /**
   * Delete all DNS records for a stack
   */
  async deleteByStackName(stackName: string): Promise<void> {
    await DatabaseDnsRecord.query().where('stack_name', stackName).delete()
  }

  /**
   * Delete all DNS records for a stack and DNS zone
   */
  async deleteByStackNameAndDnsZoneId(stackName: string, dnsZoneId: string): Promise<void> {
    await DatabaseDnsRecord.query()
      .where('stack_name', stackName)
      .where('database_dns_zone_id', dnsZoneId)
      .delete()
  }
}
