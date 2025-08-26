import { inject } from '@adonisjs/core'
import DatabaseInstance from '#models/database_instance'
import DatabaseInstanceRepository from '#repositories/database_instance_repository'
import InstanceStatus from '#enums/instance_status'

@inject()
export default class DatabaseInstanceStatsService {
  constructor(private databaseInstanceRepository: DatabaseInstanceRepository) {}

  /**
   * Get count of database instances by status from our database
   * Fast operation - no Docker calls
   */
  async getStatusCounts(
    ownerId: string,
    databases?: DatabaseInstance[]
  ): Promise<Record<InstanceStatus, number>> {
    const dbs = databases || (await this.databaseInstanceRepository.findAllInContext(ownerId))
    return this.countByStatus(dbs)
  }

  /**
   * Get total count of databases in context
   */
  async getTotalCount(ownerId: string): Promise<number> {
    return this.databaseInstanceRepository.countInContext(ownerId)
  }

  /**
   * Get databases count by status
   */
  async getCountByStatus(ownerId: string, status: InstanceStatus): Promise<number> {
    return this.databaseInstanceRepository.countByStatusInContext(ownerId, status)
  }

  /**
   * Calculate statistics from a list of databases
   */
  calculateStats(databases: DatabaseInstance[]): {
    total: number
    byStatus: Record<InstanceStatus, number>
    byEngine: Record<string, number>
    byRegion: Record<string, number>
    bySize: Record<string, number>
  } {
    const stats = {
      total: databases.length,
      byStatus: {} as Record<InstanceStatus, number>,
      byEngine: {} as Record<string, number>,
      byRegion: {} as Record<string, number>,
      bySize: {} as Record<string, number>,
    }

    // Count by status using shared logic
    stats.byStatus = this.countByStatus(databases)

    databases.forEach((db) => {
      stats.byEngine[db.databaseEngine] = (stats.byEngine[db.databaseEngine] || 0) + 1

      const regionKey = db.region?.code || 'unknown'
      stats.byRegion[regionKey] = (stats.byRegion[regionKey] || 0) + 1

      const instanceSizeKey = db.size?.name || 'unknown'
      stats.bySize[instanceSizeKey] = (stats.bySize[instanceSizeKey] || 0) + 1
    })

    return stats
  }

  /**
   * Get quick summary statistics
   */
  async getQuickSummary(ownerId: string): Promise<{
    total: number
    running: number
    stopped: number
    provisioning: number
    error: number
  }> {
    const statusCounts = await this.getStatusCounts(ownerId)

    return {
      total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      running: statusCounts[InstanceStatus.RUNNING] || 0,
      stopped: statusCounts[InstanceStatus.STOPPED] || 0,
      provisioning: statusCounts[InstanceStatus.PROVISIONING] || 0,
      error: statusCounts[InstanceStatus.ERROR] || 0,
    }
  }

  /**
   * Count database instances by status.
   */
  private countByStatus(databases: DatabaseInstance[]): Record<InstanceStatus, number> {
    const counts = Object.values(InstanceStatus).reduce(
      (acc, status) => {
        acc[status] = 0
        return acc
      },
      {} as Record<InstanceStatus, number>
    )

    databases.forEach((db) => {
      counts[db.status]++
    })

    return counts
  }
}
