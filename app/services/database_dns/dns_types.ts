import DnsRecordTypes from '#enums/dns_record_types'
import RegionCodes from '#enums/region_codes'
import ServiceTypes from '#enums/service_types'

export interface CreateDnsRecordsParams {
  stackName: string
  regionCode: RegionCodes
  serviceType: ServiceTypes
}

export interface DestroyDnsRecordsParams {
  stackName: string
  regionCode: RegionCodes
  serviceType: ServiceTypes
}

export interface DnsRecordParams {
  recordName: string
  recordType: DnsRecordTypes
  recordValue: string
  ttl: number
}

export interface Route53Change {
  action: 'CREATE' | 'DELETE'
  resourceRecordSet: {
    name: string
    type: DnsRecordTypes
    ttl: number
    resourceRecords: Array<{ value: string }>
  }
}
