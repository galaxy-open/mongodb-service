import { DateTime } from 'luxon'
import type { AxiomApiResponse } from '#interfaces/axiom'
import type { LogEntry } from '#interfaces/logs'
import LogStream from '#enums/log_stream'
import LogSource from '#enums/log_source'

export default class LogsParser {
  parseAxiomResponse(response: AxiomApiResponse): LogEntry[] {
    if (!response.tables || response.tables.length === 0) {
      return []
    }

    const table = response.tables[0]
    if (!table.fields || !table.columns) {
      return []
    }

    // Map field names to column indexes
    const fieldToIndex: Record<string, number> = {}
    table.fields.forEach((field, index) => {
      fieldToIndex[field.name] = index
    })

    // Validate required fields exist
    const requiredFields = ['_time', 'source', 'log', 'container_name']
    const missingFields = requiredFields.filter((field) => fieldToIndex[field] === undefined)
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in Axiom response: ${missingFields.join(', ')}`)
    }

    const timeIdx = fieldToIndex._time
    const sourceIdx = fieldToIndex.source
    const logIdx = fieldToIndex.log
    const containerIdx = fieldToIndex.container_name

    const numRows = table.columns[0]?.length || 0
    const logs: LogEntry[] = []

    for (let i = 0; i < numRows; i++) {
      const time = table.columns[timeIdx]?.[i] as string | undefined
      const source = table.columns[sourceIdx]?.[i] as string | undefined
      const message = table.columns[logIdx]?.[i] as string | undefined
      const containerName = table.columns[containerIdx]?.[i] as string | undefined

      if (!time || !source || !message || !containerName) {
        continue // Skip invalid rows
      }

      const log: LogEntry = {
        id: this.generateLogId(time, i),
        timestamp: DateTime.fromISO(time),
        source: this.mapSourceToLogSource(source),
        stream: this.mapSourceToStream(source),
        message,
        stackName: this.extractStackNameFromContainer(containerName),
        metadata: {
          containerName,
          rowIndex: i,
        },
      }

      logs.push(log)
    }

    return logs
  }

  private generateLogId(timestamp: string, rowIndex: number): string {
    return `${timestamp}-${rowIndex}`
  }

  private mapSourceToLogSource(source: string): LogSource | string {
    switch (source) {
      case 'stdout':
        return LogSource.STDOUT
      case 'stderr':
        return LogSource.STDERR
      case 'apprunner':
        return LogSource.APPRUNNER
      case 'scheduler':
        return LogSource.SCHEDULER
      case 'build':
        return LogSource.BUILD
      case 'builderr':
        return LogSource.BUILDERR
      case 'build-info':
        return LogSource.BUILD_INFO
      case 'build-error':
        return LogSource.BUILD_ERROR
      case 'build-warn':
        return LogSource.BUILD_WARN
      case 'deploy-info':
        return LogSource.DEPLOY_INFO
      case 'deploy-error':
        return LogSource.DEPLOY_ERROR
      case 'deploy-warn':
        return LogSource.DEPLOY_WARN
      default:
        return source
    }
  }

  private mapSourceToStream(source: string): LogStream {
    if (source.startsWith('build-')) {
      return LogStream.BUILD
    }

    if (source.startsWith('deploy-')) {
      return LogStream.GALAXY
    }

    if (source === 'stderr') {
      return LogStream.ERROR
    }

    return LogStream.APP
  }

  private extractStackNameFromContainer(containerName: string): string {
    // Extract stack name from container name format like "/stackname_service"
    const match = containerName.match(/^\/([^_]+)/)
    return match?.[1] || containerName
  }
}
