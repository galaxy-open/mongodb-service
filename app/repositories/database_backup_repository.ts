import DatabaseBackup from '#models/database_backup'
import BackupStatus from '#enums/backup_status'
import BackupTypes from '#enums/backup_types'

export default class DatabaseBackupRepository {
  /**
   * Retrieves a paginated list of DatabaseBackup instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<DatabaseBackup[]> {
    const result = await DatabaseBackup.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves a DatabaseBackup instance by its ID.
   */
  public async findById(id: string): Promise<DatabaseBackup | null> {
    return DatabaseBackup.find(id)
  }

  /**
   * Retrieves all backups for a specific database instance.
   */
  public async findByDatabaseInstanceId(
    databaseInstanceId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<DatabaseBackup[]> {
    const result = await DatabaseBackup.query()
      .where('database_instance_id', databaseInstanceId)
      .orderBy('started_at', 'desc')
      .paginate(page, limit)
    return result.all()
  }

  /**
   * Creates a new DatabaseBackup instance.
   */
  public async create(data: Partial<DatabaseBackup>): Promise<DatabaseBackup> {
    return DatabaseBackup.create(data)
  }

  /**
   * Updates an existing DatabaseBackup instance.
   */
  public async update(id: string, data: Partial<DatabaseBackup>): Promise<DatabaseBackup | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a DatabaseBackup instance by its ID.
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Finds backups by status.
   */
  public async findByStatus(status: BackupStatus): Promise<DatabaseBackup[]> {
    return DatabaseBackup.query().where('status', status)
  }

  /**
   * Finds backups by type.
   */
  public async findByType(backupType: BackupTypes): Promise<DatabaseBackup[]> {
    return DatabaseBackup.query().where('backup_type', backupType)
  }

  /**
   * Finds the latest backup for a database instance.
   */
  public async findLatestByDatabaseInstanceId(
    databaseInstanceId: string
  ): Promise<DatabaseBackup | null> {
    return DatabaseBackup.query()
      .where('database_instance_id', databaseInstanceId)
      .orderBy('started_at', 'desc')
      .first()
  }

  /**
   * Finds successful backups for a database instance.
   */
  public async findSuccessfulByDatabaseInstanceId(
    databaseInstanceId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<DatabaseBackup[]> {
    const result = await DatabaseBackup.query()
      .where('database_instance_id', databaseInstanceId)
      .where('status', BackupStatus.COMPLETED)
      .orderBy('completed_at', 'desc')
      .paginate(page, limit)
    return result.all()
  }

  /**
   * Finds expired backups that can be cleaned up.
   */
  public async findExpiredBackups(): Promise<DatabaseBackup[]> {
    return DatabaseBackup.query()
      .whereNotNull('expires_at')
      .where('expires_at', '<', new Date())
      .where('status', BackupStatus.COMPLETED)
  }

  /**
   * Finds backups in progress.
   */
  public async findInProgress(): Promise<DatabaseBackup[]> {
    return DatabaseBackup.query().where('status', BackupStatus.IN_PROGRESS)
  }

  /**
   * Counts backups by database instance and status.
   */
  public async countByDatabaseInstanceAndStatus(
    databaseInstanceId: string,
    status: BackupStatus
  ): Promise<number> {
    const result = await DatabaseBackup.query()
      .where('database_instance_id', databaseInstanceId)
      .where('status', status)
      .count('* as total')
    return Number(result[0].$extras.total)
  }
}
