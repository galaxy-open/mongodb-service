import env from '#start/env'

const route53Config = {
  aws: {
    region: env.get('AWS_REGION', 'us-east-1'),
    credentials: {
      accessKeyId: env.get('AWS_ACCESS_KEY_ID', ''),
      secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY', ''),
    },
  },

  settings: {
    changeBatchSize: env.get('ROUTE53_CHANGE_BATCH_SIZE', 100),
    waitForPropagation: env.get('ROUTE53_WAIT_FOR_PROPAGATION', true),
    propagationTimeout: env.get('ROUTE53_PROPAGATION_TIMEOUT', 300000),
    retryAttempts: env.get('ROUTE53_RETRY_ATTEMPTS', 3),
    retryDelay: env.get('ROUTE53_RETRY_DELAY', 1000),
  },
}

export default route53Config
