/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),
  APP_URL: Env.schema.string(),
  APP_NAME: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the limiter package
  |----------------------------------------------------------
  */
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  RESEND_API_KEY: Env.schema.string(),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),
  REDIS_QUEUE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the drive package
  |----------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum(['s3', 'fs'] as const),
  AWS_ACCESS_KEY_ID: Env.schema.string(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string(),
  AWS_REGION: Env.schema.string(),
  AWS_ROUTE53_ZONE_ID: Env.schema.string(),
  S3_BUCKET: Env.schema.string(),

  /*
   |----------------------------------------------------------
   | Variables for health package
   |----------------------------------------------------------
   */
  MONITORING_SECRET: Env.schema.string(),

  /*
   |----------------------------------------------------------
   | Variables for OAuth and Trusted Identity Provider
   |----------------------------------------------------------
   */
  OAUTH_CLIENT_ID: Env.schema.string(),
  OAUTH_CLIENT_SECRET_HASH: Env.schema.string(),
  OAUTH_REDIRECT_URI: Env.schema.string(),
  TIP_NAME: Env.schema.string(),
  TIP_ISSUER_URL: Env.schema.string(),
  TIP_EXPECTED_AUDIENCE: Env.schema.string(),
  TIP_JWKS_URI: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the lock package
  |----------------------------------------------------------
  */
  LOCK_STORE: Env.schema.enum(['database', 'memory'] as const),

  BASE_DOMAIN: Env.schema.string(),
  ENVIRONMENT: Env.schema.enum(['prod', 'stg', 'test'] as const),
  DNS_RECORD_TTL: Env.schema.number(),

  /*
   |----------------------------------------------------------
   | Variables for configuring Route53
   |----------------------------------------------------------
   */
  ROUTE53_CHANGE_BATCH_SIZE: Env.schema.number.optional(),
  ROUTE53_WAIT_FOR_PROPAGATION: Env.schema.boolean.optional(),
  ROUTE53_PROPAGATION_TIMEOUT: Env.schema.number.optional(),
  ROUTE53_RETRY_ATTEMPTS: Env.schema.number.optional(),
  ROUTE53_RETRY_DELAY: Env.schema.number.optional(),

  /*
   |----------------------------------------------------------
   | Variables for configuring the certificate
   |----------------------------------------------------------
   */
  CERTIFICATE_ORGANIZATION: Env.schema.string(),
  CERTIFICATE_COUNTRY: Env.schema.string(),
  CERTIFICATE_VALIDITY_DAYS: Env.schema.string(),
  CERTIFICATE_CA_KEY_SIZE: Env.schema.number(),

  /*
   |----------------------------------------------------------
   | Variables for configuring the Docker Swarm Manager
   |----------------------------------------------------------
   */
  DOCKER_SWARM_MANAGER_HOST_URL: Env.schema.string(),
  DOCKER_SWARM_MANAGER_CA: Env.schema.string(),
  DOCKER_SWARM_MANAGER_CERT: Env.schema.string(),
  DOCKER_SWARM_MANAGER_KEY: Env.schema.string(),

  /*
   |----------------------------------------------------------
   | Variables for configuring Prometheus monitoring
   |----------------------------------------------------------
   */
  PROMETHEUS_URL: Env.schema.string(),
  PROMETHEUS_USERNAME: Env.schema.string(),
  PROMETHEUS_PASSWORD: Env.schema.string(),

  /*
   |----------------------------------------------------------
   | Variables for configuring Axiom logs
   |----------------------------------------------------------
   */
  AXIOM_TOKEN: Env.schema.string(),
  AXIOM_API_URL: Env.schema.string(),
  LOG_DATASET_PREFIX: Env.schema.string.optional(),
})
