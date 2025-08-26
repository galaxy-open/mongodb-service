import type { DateTime } from 'luxon'
import type LogStream from '#enums/log_stream'

export interface AxiomApiResponse {
  status: {
    rowsMatched: number
    rowsExamined: number
    elapsedTime: number
  }
  tables: AxiomTable[]
  format: 'tabular' | 'legacy'
}

export interface AxiomTable {
  name: string
  fields: AxiomField[]
  columns: any[][]
}

export interface AxiomField {
  name: string
  type: string
}

export interface AxiomQueryParams {
  apl: string
  startTime?: string
  endTime?: string
}

export interface AxiomLogEntry {
  timestamp: string
  source: string
  message: string
  containerName: string
}

export interface AxiomDatabaseLogsParams {
  stackName: string
  region?: string
  limit?: number
  minDate?: DateTime
  maxDate?: DateTime
  stream?: LogStream
  cursorTimestamp?: string
}
