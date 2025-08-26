import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'
import TLSModes from '#enums/tls_modes'
import DatabaseVersions from '#enums/database_versions'
import { DriveDisks } from '@adonisjs/drive/types'
import DockerSwarmManager from '#models/docker_swarm_manager'
import RegionCodes from '#enums/region_codes'

export interface DatabaseCertificateGenerationParams {
  databaseEngine: DatabaseEngines
  deploymentType: DeploymentTypes
  stackName: string
  regionCode: RegionCodes
  tlsMode: TLSModes
  cluster: DockerSwarmManager
}

export interface DatabaseCertificateFiles {
  caKey: string
  caCert: string
  csrKey: string
  csr: string
  crt: string
  finalPem: string
}

export interface DatabaseCertificateConfig {
  organization: string
  country: string
  keySize: number
  validityDays: string
  caKeySize: number
}

export interface OpenSSLCommands {
  generateCA: string
  generateCSR: string
  generateCert: string
  createFinalPem: string
}

export interface DatabaseCertificateResult {
  files: string[]
  certificateFiles: DatabaseCertificateFiles
  commonName: string
}

export interface DatabaseCertificateUploadParams {
  stackName: string
  files: string[]
  databaseEngine: DatabaseEngines
}

export interface DatabaseCertificateUploadResult {
  uploadedFiles: string[]
  provider: keyof DriveDisks
  basePath: string
}

// Docker Secret Types
export interface DatabaseCertificateSecretCreationParams {
  stackName: string
  databaseVersion: DatabaseVersions
  tlsMode: TLSModes
}

export interface DatabaseCertificateSecrets {
  tlsSecretName: string
  caSecretName: string
  certLabel: string
}
