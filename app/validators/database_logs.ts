import vine from '@vinejs/vine'
import LogStream from '#enums/log_stream'

export const getDatabaseLogsValidator = vine.compile(
  vine.object({
    params: vine.object({
      id: vine.string(),
    }),
    limit: vine.number().optional(),
    cursor: vine.string().optional(),
    minDate: vine.string().optional(),
    maxDate: vine.string().optional(),
    stream: vine.enum(LogStream).optional(),
  })
)
