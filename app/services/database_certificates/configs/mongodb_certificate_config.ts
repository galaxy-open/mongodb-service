import { inject } from '@adonisjs/core'
import DeploymentTypes from '#enums/deployment_types'
import env from '#start/env'
import {
  DatabaseCertificateConfig,
  DatabaseCertificateFiles,
  DatabaseCertificateGenerationParams,
  OpenSSLCommands,
} from '#services/database_certificates/types/database_certificate_types'
import { BaseCertificateConfig } from '#services/database_certificates/configs/base_certificate_config'

@inject()
export default class MongoDBCertificateConfig extends BaseCertificateConfig {
  buildCertificateParams(params: DatabaseCertificateGenerationParams): DatabaseCertificateConfig {
    return {
      organization: env.get('CERTIFICATE_ORGANIZATION'),
      country: env.get('CERTIFICATE_COUNTRY'),
      keySize: params.deploymentType === DeploymentTypes.REPLICASET ? 4096 : 2048,
      validityDays: env.get('CERTIFICATE_VALIDITY_DAYS'),
      caKeySize: Number(env.get('CERTIFICATE_CA_KEY_SIZE')),
    }
  }

  buildCommands(
    files: DatabaseCertificateFiles,
    cn: string,
    config: DatabaseCertificateConfig
  ): OpenSSLCommands {
    const subject = `/C=${config.country}/O=${config.organization}/CN=${cn}`

    return {
      generateCA: [
        'openssl',
        'req',
        '-nodes',
        '-newkey',
        `rsa:${config.caKeySize}`,
        '-keyout',
        files.caKey,
        '-out',
        files.caCert,
        '-x509',
        '-subj',
        subject,
        '-days',
        config.validityDays,
      ].join(' '),

      generateCSR: [
        'openssl',
        'req',
        '-nodes',
        '-newkey',
        `rsa:${config.keySize}`,
        '-sha256',
        '-keyout',
        files.csrKey,
        '-out',
        files.csr,
        '-subj',
        subject,
        '-days',
        config.validityDays,
      ].join(' '),

      generateCert: [
        'openssl',
        'x509',
        '-req',
        '-in',
        files.csr,
        '-CA',
        files.caCert,
        '-CAkey',
        files.caKey,
        '-set_serial',
        '00',
        '-out',
        files.crt,
        '-days',
        config.validityDays,
      ].join(' '),

      createFinalPem: `cat ${files.csrKey} ${files.crt} > ${files.finalPem}`,
    }
  }
}
