import WorkerHealthService from '#services/infrastructure/health/worker_health_service'
import { DiskSpaceCheck, HealthChecks, MemoryHeapCheck } from '@adonisjs/core/health'
import app from '@adonisjs/core/services/app'
import { DbCheck, DbConnectionCountCheck } from '@adonisjs/lucid/database'
import db from '@adonisjs/lucid/services/db'
import { RedisCheck, RedisMemoryUsageCheck } from '@adonisjs/redis'
import redis from '@adonisjs/redis/services/main'

// Custom worker health check
class WorkerHealthCheck {
  name = 'job_workers'

  async run() {
    try {
      const workerHealthService = await app.container.make(WorkerHealthService)

      const healthStatus = await workerHealthService.getHealthStatus()

      return {
        message: healthStatus.message,
        status: healthStatus.healthy ? ('ok' as const) : ('error' as const),
        finishedAt: new Date(),
        meta: {
          ...healthStatus.metrics,
          alerts: healthStatus.alerts,
        },
      }
    } catch (error) {
      return {
        message: `Worker health check failed: ${error.message}`,
        status: 'error' as const,
        finishedAt: new Date(),
        meta: {},
      }
    }
  }
}

export const healthChecks = new HealthChecks().register([
  new DiskSpaceCheck(),
  new MemoryHeapCheck(),
  new DbCheck(db.connection()),
  new DbConnectionCountCheck(db.connection()),
  new RedisCheck(redis.connection()),
  new RedisMemoryUsageCheck(redis.connection()),
  new WorkerHealthCheck(),
])
