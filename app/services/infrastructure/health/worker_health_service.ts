import { inject } from '@adonisjs/core'
import JobHistoryService from '#services/job_history_service'

export interface WorkerHealthMetrics {
  longRunningJobs: number
  failedJobsLastHour: number
  failedJobsLast24h: number
  activeJobs: number
  completedJobsLastHour: number
  avgProcessingTime: number | null
}

export interface WorkerHealthStatus {
  healthy: boolean
  message: string
  metrics: WorkerHealthMetrics
  alerts: string[]
}

@inject()
export default class WorkerHealthService {
  constructor(private jobHistoryService: JobHistoryService) {}

  async getHealthStatus(): Promise<WorkerHealthStatus> {
    const metrics = await this.getMetrics()
    const alerts = this.generateAlerts(metrics)
    const healthy = alerts.length === 0

    return {
      healthy,
      message: healthy ? 'Workers are healthy' : 'Worker issues detected',
      metrics,
      alerts,
    }
  }

  async getMetrics(): Promise<WorkerHealthMetrics> {
    const [
      longRunningJobs,
      failedJobsLastHour,
      failedJobsLast24h,
      activeJobs,
      completedJobsLastHour,
      avgProcessingTime,
    ] = await Promise.all([
      this.jobHistoryService.findLongRunningJobs(30),
      this.jobHistoryService.getFailedJobsCount(1),
      this.jobHistoryService.getFailedJobsCount(24),
      this.jobHistoryService.getActiveJobsCount(),
      this.jobHistoryService.getCompletedJobsCount(1),
      this.jobHistoryService.getAverageProcessingTime(24),
    ])

    return {
      longRunningJobs: longRunningJobs.length,
      failedJobsLastHour,
      failedJobsLast24h,
      activeJobs,
      completedJobsLastHour,
      avgProcessingTime,
    }
  }

  private generateAlerts(metrics: WorkerHealthMetrics): string[] {
    const alerts: string[] = []

    if (metrics.longRunningJobs > 0) {
      alerts.push(`${metrics.longRunningJobs} jobs running longer than 30 minutes`)
    }

    if (metrics.failedJobsLastHour > 5) {
      alerts.push(`High failure rate: ${metrics.failedJobsLastHour} failed jobs in the last hour`)
    }

    if (metrics.failedJobsLast24h > 50) {
      alerts.push(`Very high failure rate: ${metrics.failedJobsLast24h} failed jobs in last 24h`)
    }

    if (metrics.activeJobs > 10 && metrics.completedJobsLastHour === 0) {
      alerts.push(
        `Possible stuck queue: ${metrics.activeJobs} active jobs but no completions in the last hour`
      )
    }

    if (metrics.avgProcessingTime && metrics.avgProcessingTime > 300) {
      alerts.push(
        `High average processing time: ${metrics.avgProcessingTime.toFixed(2)} seconds over last 24 hours`
      )
    }

    return alerts
  }

  async logHealthStatus(): Promise<void> {
    const status = await this.getHealthStatus()

    if (status.healthy) {
      console.log('✅ Worker health check: All systems healthy')
      console.log(
        `📊 Metrics: Active: ${status.metrics.activeJobs}, Failed(1h): ${status.metrics.failedJobsLastHour}, Avg time: ${status.metrics.avgProcessingTime?.toFixed(2)}s`
      )
    } else {
      console.warn('⚠️ Worker health check: Issues detected')
      status.alerts.forEach((alert) => console.warn(`   - ${alert}`))
    }
  }
}
