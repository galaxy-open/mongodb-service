import DnsRecordTypes from '#enums/dns_record_types'
import { DnsRecordParams } from '#services/database_dns/dns_types'
import env from '#start/env'
import DockerSwarmWorker from '#models/docker_swarm_worker'

export default class WorkerDnsResolver {
  async buildDnsRecordsForStack(
    stackName: string,
    workerNodes: DockerSwarmWorker[]
  ): Promise<DnsRecordParams[]> {
    const baseDomain = env.get('BASE_DOMAIN')
    const environment = env.get('ENVIRONMENT')

    return workerNodes.map((worker) => {
      return {
        recordName: `${stackName}-${worker.workerNumber}.${worker.dockerSwarmManager.hostnamePrefix}.${environment}.${baseDomain}`,
        recordType: DnsRecordTypes.CNAME,
        recordValue: `${worker.name}.${environment}.${baseDomain}`,
        ttl: Number(env.get('DNS_RECORD_TTL')),
      }
    })
  }
}
