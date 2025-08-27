import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'

@inject()
export default class SwarmPortsLogParser {
  constructor(private logger: Logger) {}

  /**
   * Parse swarm-ports-brief service logs to extract ports by worker as Sets
   */
  parsePortsFromLogs(logs: string): Record<string, Set<number>> {
    const lines = logs.split('\n').filter((line) => line.trim())
    const workers: Record<string, Set<number>> = {}

    for (const line of lines) {
      const match = this.parseWorkerLogLine(line)
      if (!match) continue

      const { workerName, ports } = match

      if (!workers[workerName]) {
        workers[workerName] = new Set<number>()
      }

      ports.forEach((port) => workers[workerName].add(port))
    }

    this.logParsingResults(workers)
    return workers
  }

  private parseWorkerLogLine(line: string): { workerName: string; ports: number[] } | null {
    const match = line.match(/\|\s*(worker-\d+)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}:\s*(.+)$/)

    if (!match) return null

    const workerName = match[1].toLowerCase()
    const portsString = match[2]

    const ports = portsString
      .split(',')
      .map((p) => Number.parseInt(p.trim(), 10))
      .filter((port) => port > 0 && port < 65536)

    return { workerName, ports }
  }

  private logParsingResults(workers: Record<string, Set<number>>): void {
    const totalPorts = Object.values(workers).reduce((sum, ports) => sum + ports.size, 0)

    this.logger.debug(
      {
        workers: Object.keys(workers),
        totalPorts,
        portsByWorker: Object.fromEntries(
          Object.entries(workers).map(([worker, ports]) => [worker, ports.size])
        ),
      },
      'Parsed ports from swarm-ports-brief service'
    )
  }
}
