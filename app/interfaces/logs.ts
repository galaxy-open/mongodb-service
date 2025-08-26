import type { DateTime } from 'luxon'
import type LogStream from '#enums/log_stream'
import type LogSource from '#enums/log_source'

export interface LogQuery {
  stackName: string
  region?: string
  limit?: number
  minDate?: string
  maxDate?: string
  stream?: LogStream
  container?: string
  cursorTimestamp?: string
}

export interface LogResult {
  logs: LogEntry[]
  totalItems: number
  nextPageTimestamp?: string
}

export interface LogMetadata {
  containerName: string
  rowIndex: number
}

export interface LogEntry {
  id: string
  timestamp: DateTime
  source: LogSource | string
  stream: LogStream
  message: string
  stackName: string
  metadata?: LogMetadata
}
