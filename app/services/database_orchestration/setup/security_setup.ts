import { inject } from '@adonisjs/core'
import DatabaseInstance from '#models/database_instance'
import TlsMode from '#enums/tls_modes'
import DockerSwarmManager from '#models/docker_swarm_manager'
import DatabaseCertificateSecretService from '#services/database_certificates/database_certificate_secret_service'
import DatabaseCertificatesService from '#services/database_certificates/database_certificates_service'
import {
  DatabaseCertificateResult,
  DatabaseCertificateSecrets,
} from '#services/database_certificates/types/database_certificate_types'

export interface SecurityResult {
  certificates: DatabaseCertificateResult | null
  secrets: DatabaseCertificateSecrets | null
  tlsSecretName?: string
  caSecretName?: string
  certLabel?: string
}

@inject()
export default class SecuritySetup {
  constructor(
    protected certificateSecretService: DatabaseCertificateSecretService,
    protected certificatesService: DatabaseCertificatesService
  ) {}

  async setupSecurity(
    databaseInstance: DatabaseInstance,
    cluster: DockerSwarmManager
  ): Promise<SecurityResult> {
    if (databaseInstance.tlsMode === TlsMode.OFF) {
      return {
        certificates: null,
        secrets: null,
      }
    }

    const certificatesResult = await this.certificatesService.generate({
      databaseEngine: databaseInstance.databaseEngine,
      deploymentType: databaseInstance.deploymentType,
      stackName: databaseInstance.stackName,
      regionCode: databaseInstance.regionCode,
      tlsMode: databaseInstance.tlsMode,
      cluster,
    })
    const secrets = await this.certificateSecretService.createSecrets(
      cluster,
      certificatesResult.certificates,
      {
        stackName: databaseInstance.stackName,
        databaseVersion: databaseInstance.version.version,
        tlsMode: databaseInstance.tlsMode,
      }
    )

    return {
      certificates: certificatesResult.certificates,
      secrets,
      tlsSecretName: secrets.tlsSecretName,
      caSecretName: secrets.caSecretName,
      certLabel: secrets.certLabel,
    }
  }
}
