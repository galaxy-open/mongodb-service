import { inject } from '@adonisjs/core'
import env from '#start/env'

@inject()
export default class WorkerNodeCNResolver {
  async resolveCN(hostnamePrefix: string): Promise<string> {
    const baseDomain = env.get('BASE_DOMAIN')
    const environment = env.get('ENVIRONMENT')

    // Dynamic CN from cluster hostname_prefix
    // Examples:
    // - mongodb -> *.mongodb.development.example.com
    // - eu-rbx-mongodb -> *.eu-rbx-mongodb.development.example.com
    // - ap-syd-mongodb -> *.ap-syd-mongodb.development.example.com
    return `*.${hostnamePrefix}.${environment}.${baseDomain}`
  }
}
