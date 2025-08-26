import { BaseSeeder } from '@adonisjs/lucid/seeders'
import DatabaseVersion from '#models/database_version'
import DatabaseEngines from '#enums/database_engines'
import DatabaseVersions from '#enums/database_versions'

export default class extends BaseSeeder {
  async run() {
    // Define which versions are internal (not shown in UI)
    const internalVersions = [
      DatabaseVersions.MONGODB_4_4_24,
      DatabaseVersions.MONGODB_5_0_21,
      DatabaseVersions.MONGODB_6_0_12,
      DatabaseVersions.MONGODB_6_0_16,
      DatabaseVersions.MONGODB_7_0_15,
    ]

    const MongoDB = Object.entries(DatabaseVersions).filter(([key]) => key.startsWith('MONGODB_'))
    const MongoDBVersions = MongoDB.map(([_key, version]) => ({
      version,
      displayName: `MongoDB ${version}`,
      databaseEngine: DatabaseEngines.MONGODB,
      isVisible: !internalVersions.includes(version),
    }))

    try {
      await DatabaseVersion.createMany(MongoDBVersions)
    } catch (e) {
      console.log(e)
    }
  }
}
