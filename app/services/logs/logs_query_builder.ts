import type { AxiomDatabaseLogsParams } from '#interfaces/axiom'
import LogStream from '#enums/log_stream'

export default class LogsQueryBuilder {
  buildDatabaseLogsQuery(dataset: string, params: AxiomDatabaseLogsParams): string {
    this.validateParams(params)

    let apl = `['${dataset}']`
    apl = this.addProjection(apl)
    apl = this.addFilters(apl, params)
    apl = this.addSorting(apl)
    apl = this.addLimit(apl, params.limit)

    return apl
  }

  private validateParams(params: AxiomDatabaseLogsParams): void {
    if (!params.stackName) {
      throw new Error('Stack name is required')
    }
  }

  private addProjection(query: string): string {
    return `${query} | project _time, source, log, container_name`
  }

  private addFilters(query: string, params: AxiomDatabaseLogsParams): string {
    let filteredQuery = query

    // Stack name filter - most important for database logs
    filteredQuery += ` | where container_name startswith '/${params.stackName}_'`

    // Stream filter
    if (params.stream) {
      filteredQuery += this.buildStreamFilter(params.stream)
    }

    // Time range filters
    if (params.minDate) {
      filteredQuery += ` | where _time >= datetime('${params.minDate.toISO()}')`
    }

    if (params.maxDate) {
      filteredQuery += ` | where _time <= datetime('${params.maxDate.toISO()}')`
    }

    // Cursor for pagination
    if (params.cursorTimestamp) {
      filteredQuery += ` | where _time < datetime('${params.cursorTimestamp}')`
    }

    return filteredQuery
  }

  private buildStreamFilter(stream: LogStream): string {
    switch (stream) {
      case LogStream.APP:
        return ` | where source == 'stdout' or source == 'stderr'`
      case LogStream.BUILD:
        return ` | where source == 'build-info' or source == 'build-error' or source == 'build-warn'`
      case LogStream.GALAXY:
        return ` | where source == 'deploy-info' or source == 'deploy-error' or source == 'deploy-warn'`
      case LogStream.ERROR:
        return ` | where source == 'stderr'`
      default:
        return ''
    }
  }

  private addSorting(query: string): string {
    return `${query} | sort by _time desc`
  }

  private addLimit(query: string, limit?: number): string {
    const defaultLimit = 100
    return `${query} | limit ${limit || defaultLimit}`
  }
}
