enum LogSource {
  STDOUT = 'stdout',
  STDERR = 'stderr',
  APPRUNNER = 'apprunner',
  SCHEDULER = 'scheduler',
  BUILD = 'build',
  BUILDERR = 'builderr',
  BUILD_INFO = 'build-info',
  BUILD_ERROR = 'build-error',
  BUILD_WARN = 'build-warn',
  DEPLOY_INFO = 'deploy-info',
  DEPLOY_ERROR = 'deploy-error',
  DEPLOY_WARN = 'deploy-warn',
}

export default LogSource
