import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Region from '#models/region'
import CloudProviders from '#enums/cloud_providers'
import RegionCodes from '#enums/region_codes'

export default class extends BaseSeeder {
  async run() {
    await Region.createMany([
      {
        code: RegionCodes.US_EAST_1,
        name: 'AWS US East (Virginia)',
        displayName: 'United States East',
        provider: CloudProviders.AWS,
        countryCode: 'US',
        timezone: 'America/New_York',
      },
      {
        code: RegionCodes.EU_WEST_1,
        name: 'AWS EU West (Ireland)',
        displayName: 'Europe West',
        provider: CloudProviders.AWS,
        countryCode: 'IE',
        timezone: 'Europe/Dublin',
      },
      {
        code: RegionCodes.AP_SOUTHEAST_2,
        name: 'AWS AP Southeast (Sydney)',
        displayName: 'Australia Southeast',
        provider: CloudProviders.AWS,
        countryCode: 'AU',
        timezone: 'Australia/Sydney',
      },
      {
        code: RegionCodes.STAGING,
        name: 'Staging',
        displayName: 'Staging',
        provider: CloudProviders.AWS,
        countryCode: 'US',
        timezone: 'America/New_York',
      },
    ])
  }
}
