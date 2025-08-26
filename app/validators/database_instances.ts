import vine from '@vinejs/vine'
import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'
import TLSModes from '#enums/tls_modes'
import DatabaseInstanceNames from '#enums/database_instance_names'
import DatabaseVersions from '#enums/database_versions'
import RegionCodes from '#enums/region_codes'

const nameField = vine
  .string()
  .trim()
  .minLength(3)
  .maxLength(255)
  .alpha() // only letters
  .transform((value) => value.toLowerCase())

/**
 * Validator to validate the payload when creating
 * a new database instance
 */
export const createDatabaseInstanceValidator = vine.compile(
  vine.object({
    name: nameField,
    databaseEngine: vine.enum(DatabaseEngines),
    deploymentType: vine.enum(DeploymentTypes),
    tlsMode: vine.enum(TLSModes),
    regionCode: vine.enum(RegionCodes),
    instanceSize: vine.enum(DatabaseInstanceNames),
    databaseVersion: vine.enum(DatabaseVersions),
  })
)

/**
 * Validator to validate the payload when updating
 * an existing database instance
 * Note: databaseEngine and deploymentType cannot be updated after creation
 */
export const updateDatabaseInstanceValidator = vine.compile(
  vine.object({
    name: nameField.optional(),
    tlsMode: vine.enum(TLSModes).optional(),
    deploymentType: vine.enum(DeploymentTypes).optional(),
    instanceSize: vine.enum(DatabaseInstanceNames).optional(),
    regionCode: vine.enum(RegionCodes).optional(),
    databaseVersion: vine.enum(DatabaseVersions).optional(),
    params: vine.object({
      id: vine.string().uuid(),
    }),
  })
)

export const databaseInstanceIdValidator = vine.compile(
  vine.object({
    params: vine.object({
      id: vine.string().uuid(),
    }),
  })
)
