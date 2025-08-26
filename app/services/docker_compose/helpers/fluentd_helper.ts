import env from '#start/env'
import DatabaseEngines from '#enums/database_engines'

export default class FluentdHelper {
  private readonly FLUENTD_PORT_MAP: Record<DatabaseEngines, string> = {
    [DatabaseEngines.MONGODB]: '33001',
  }

  buildURL(databaseEngine: DatabaseEngines): string {
    const environment = env.get('ENVIRONMENT')
    const baseDomain = env.get('BASE_DOMAIN')
    const fluentdHost = `logger.${environment}.${baseDomain}`
    const port = this.FLUENTD_PORT_MAP[databaseEngine]

    if (!port) {
      throw new Error(`Fluentd port not configured for database engine: ${databaseEngine}`)
    }

    return `${fluentdHost}:${port}`
  }
}
