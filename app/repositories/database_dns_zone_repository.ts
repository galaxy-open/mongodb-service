import DatabaseEngines from '#enums/database_engines'
import RegionCodes from '#enums/region_codes'
import DatabaseDnsZone from '#models/database_dns_zone'

export default class DatabaseDnsZoneRepository {
  /**
   * Find DNS zone by region and database engine
   */
  async findByRegionAndEngine(
    regionCode: RegionCodes,
    databaseEngine: DatabaseEngines
  ): Promise<DatabaseDnsZone> {
    const dnsZone = await DatabaseDnsZone.query()
      .where('region_code', regionCode)
      .where('database_engine', databaseEngine)
      .where('is_active', true)
      .first()
    if (!dnsZone) {
      throw new Error(
        `DnsZone with region ${regionCode} and database engine ${databaseEngine} not found`
      )
    }
    return dnsZone
  }

  /**
   * Find DNS zone by region and database engine or fail
   */
  async findByRegionAndEngineOrFail(
    regionCode: RegionCodes,
    databaseEngine: DatabaseEngines
  ): Promise<DatabaseDnsZone> {
    const dnsZone = await DatabaseDnsZone.query()
      .where('region_code', regionCode)
      .where('database_engine', databaseEngine)
      .where('is_active', true)
      .first()
    if (!dnsZone) {
      throw new Error(
        `DnsZone with region ${regionCode} and database engine ${databaseEngine} not found`
      )
    }
    return dnsZone
  }

  /**
   * Find DNS zone by zone ID
   */
  async findByZoneId(externalZoneIdentifier: string): Promise<DatabaseDnsZone> {
    const dnsZone = await DatabaseDnsZone.query()
      .where('external_zone_identifier', externalZoneIdentifier)
      .where('is_active', true)
      .first()
    if (!dnsZone) {
      throw new Error(`DnsZone with externalZoneIdentifier ${externalZoneIdentifier} not found`)
    }
    return dnsZone
  }

  /**
   * Find all active DNS zones
   */
  async findAllActive(): Promise<DatabaseDnsZone[]> {
    return DatabaseDnsZone.query()
      .innerJoin('regions', 'database_dns_zones.region_code', 'regions.code')
      .where('database_dns_zones.is_active', true)
      .orderBy('regions.code', 'asc')
  }

  /**
   * Find all DNS zones by region
   */
  async findByRegion(regionCode: RegionCodes): Promise<DatabaseDnsZone[]> {
    return DatabaseDnsZone.query()
      .where('region_code', regionCode)
      .orderBy('database_engine', 'asc')
  }

  /**
   * Find DNS zone by ID
   */
  async findById(id: string): Promise<DatabaseDnsZone> {
    return DatabaseDnsZone.findOrFail(id)
  }

  /**
   * Create a new DNS zone
   */
  async create(data: Partial<DatabaseDnsZone>): Promise<DatabaseDnsZone> {
    return DatabaseDnsZone.create(data)
  }

  /**
   * Update DNS zone
   */
  async update(id: string, data: Partial<DatabaseDnsZone>): Promise<DatabaseDnsZone> {
    const zone = await DatabaseDnsZone.findOrFail(id)
    return zone.merge(data).save()
  }

  /**
   * Delete DNS zone
   */
  async delete(id: string): Promise<void> {
    const zone = await DatabaseDnsZone.findOrFail(id)
    await zone.delete()
  }
}
