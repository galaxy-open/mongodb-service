import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import DnsRecordService from '#services/database_dns/dns_record_service'
import DatabaseDnsRecordRepository from '#repositories/database_dns_record_repository'
import DatabaseDnsZoneRepository from '#repositories/database_dns_zone_repository'
import WorkerDnsResolver from '#services/database_dns/helpers/worker_dns_resolver'
import DnsRecordConverter from '#services/database_dns/helpers/dns_record_converter'
import DatabaseEngines from '#enums/database_engines'
import DnsRecordStatus from '#enums/dns_record_status'
import { DnsRecordParams } from '#services/database_dns/dns_types'
import ServiceTypes from '#enums/service_types'
import RegionCodes from '#enums/region_codes'
import DockerSwarmWorker from '#models/docker_swarm_worker'

export interface CreateDatabaseDnsParams {
  stackName: string
  regionCode: RegionCodes
  databaseEngine: DatabaseEngines
  serviceType: ServiceTypes
  ownerId: string
  workerNodes: DockerSwarmWorker[]
}

export interface DestroyDatabaseDnsParams {
  stackName: string
  regionCode: RegionCodes
  databaseEngine: DatabaseEngines
}

@inject()
export default class DatabaseDnsService {
  constructor(
    private dnsRecordService: DnsRecordService,
    private dnsRecordRepository: DatabaseDnsRecordRepository,
    private dnsZoneRepository: DatabaseDnsZoneRepository,
    private workerDnsResolver: WorkerDnsResolver,
    private dnsRecordConverter: DnsRecordConverter
  ) {}

  async createDatabaseDnsRecords(params: CreateDatabaseDnsParams): Promise<void> {
    logger.info('Creating DNS records for database')

    const dnsZone = await this.dnsZoneRepository.findByRegionAndEngineOrFail(
      params.regionCode,
      params.databaseEngine
    )

    // Check for existing records and clean them up first
    const existingRecords = await this.dnsRecordRepository.findByStackNameAndDnsZoneId(
      params.stackName,
      dnsZone.id
    )

    if (existingRecords.length > 0) {
      logger.info(
        {
          stackName: params.stackName,
          existingRecordCount: existingRecords.length,
        },
        'Found existing DNS records, cleaning up first'
      )

      try {
        const existingRecordSpecs = this.dnsRecordConverter.databaseRecordsToSpecs(existingRecords)

        await this.dnsRecordService.deleteRecords(
          dnsZone.externalZoneIdentifier,
          existingRecordSpecs
        )
        await this.dnsRecordRepository.deleteByStackNameAndDnsZoneId(params.stackName, dnsZone.id)

        logger.info(
          {
            stackName: params.stackName,
          },
          'Existing DNS records cleaned up successfully'
        )
      } catch (cleanupError) {
        logger.warn('Failed to cleanup existing DNS records, proceeding with upsert', {
          stackName: params.stackName,
          error: (cleanupError as Error).message,
        })
      }
    }

    const dnsRecords = await this.workerDnsResolver.buildDnsRecordsForStack(
      params.stackName,
      params.workerNodes
    )

    const recordSpecs = this.dnsRecordConverter.paramsToSpecs(dnsRecords)

    try {
      await this.dnsRecordService.createRecords(dnsZone.externalZoneIdentifier, recordSpecs)

      await this.storeDnsRecords(params.stackName, dnsZone.id, dnsRecords, DnsRecordStatus.ACTIVE)

      logger.info('DNS records created successfully')
    } catch (error) {
      await this.storeDnsRecords(params.stackName, dnsZone.id, dnsRecords, DnsRecordStatus.FAILED)
      throw error
    }
  }

  async destroyDatabaseDnsRecords(params: DestroyDatabaseDnsParams): Promise<void> {
    logger.info('Destroying DNS records for database')

    const dnsZone = await this.dnsZoneRepository.findByRegionAndEngineOrFail(
      params.regionCode,
      params.databaseEngine
    )

    const existingRecords = await this.dnsRecordRepository.findByStackNameAndDnsZoneId(
      params.stackName,
      dnsZone.id
    )

    if (existingRecords.length === 0) {
      logger.warn('No DNS records found to destroy', {
        stackName: params.stackName,
        dnsZoneId: dnsZone.externalZoneIdentifier,
      })
      return
    }

    const recordSpecs = this.dnsRecordConverter.databaseRecordsToSpecs(existingRecords)

    await this.dnsRecordService.deleteRecords(dnsZone.externalZoneIdentifier, recordSpecs)

    await this.dnsRecordRepository.deleteByStackNameAndDnsZoneId(params.stackName, dnsZone.id)

    logger.info(
      {
        stackName: params.stackName,
        recordCount: existingRecords.length,
      },
      'DNS records destroyed successfully'
    )
  }

  private async storeDnsRecords(
    stackName: string,
    databaseDnsZoneId: string,
    dnsRecords: DnsRecordParams[],
    status: DnsRecordStatus = DnsRecordStatus.ACTIVE
  ): Promise<void> {
    const recordsToStore = dnsRecords.map((record) => ({
      stackName,
      recordName: record.recordName,
      recordType: record.recordType,
      recordValue: record.recordValue,
      ttl: record.ttl,
      databaseDnsZoneId,
      status,
    }))

    await this.dnsRecordRepository.createMany(recordsToStore)
  }
}
