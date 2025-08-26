import vine from '@vinejs/vine'
import DatabaseEngines from '#enums/database_engines'

/**
 * Validator for database versions index query parameters
 */
export const databaseVersionIndexValidator = vine.compile(
  vine.object({
    visible: vine.boolean().optional(),
    database_engine: vine.enum(DatabaseEngines).optional(),
  })
)
