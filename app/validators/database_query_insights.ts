import vine from '@vinejs/vine'
import TimeRange from '#enums/time_range'

export const getDatabaseQueryInsightsValidator = vine.compile(
  vine.object({
    params: vine.object({
      id: vine.string(),
    }),
    timeRange: vine.enum(TimeRange),
  })
)
