enum DockerSyncStatus {
  SYNCED = 'synced',
  DB_ONLY = 'db_only',
  DOCKER_ONLY = 'docker_only',
  STATUS_MISMATCH = 'status_mismatch',
}

export default DockerSyncStatus
