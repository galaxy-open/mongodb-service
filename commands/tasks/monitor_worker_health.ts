import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { schedule } from 'adonisjs-scheduler'
import { inject } from '@adonisjs/core'
import WorkerHealthService from '#services/infrastructure/health/worker_health_service'

@schedule((s) => s.everyFiveMinutes())
export default class MonitorWorkerHealth extends BaseCommand {
  static commandName = 'monitor:worker-health'
  static description = 'Monitor worker health and alert on issues'

  static options: CommandOptions = {
    startApp: true,
  }

  @inject()
  async run(workerHealthService: WorkerHealthService) {
    this.logger.info('Running worker health check...')

    try {
      await workerHealthService.logHealthStatus()
      this.logger.info('Worker health check completed successfully')
    } catch (error) {
      this.logger.error('Worker health check failed:', error)
      this.exitCode = 1
    }
  }
}
