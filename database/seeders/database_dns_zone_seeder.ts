import DatabaseEngines from '#enums/database_engines'
import RegionCodes from '#enums/region_codes'
import DatabaseDnsZone from '#models/database_dns_zone'
import Region from '#models/region'
import env from '#start/env'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const region = await Region.query().where('code', RegionCodes.STAGING).first()
    if (!region) {
      throw new Error('Region not found')
    }

    const hostedZones = [
      {
        regionCode: region.code,
        databaseEngine: DatabaseEngines.MONGODB,
        externalZoneIdentifier: env.get('AWS_ROUTE53_ZONE_ID'),
        domainName: `${DatabaseEngines.MONGODB}.${env.get('ENVIRONMENT')}.${env.get('BASE_DOMAIN')}`,
        isActive: true,
      },
    ]
    await DatabaseDnsZone.updateOrCreateMany(['regionCode', 'databaseEngine'], hostedZones)
  }
}
