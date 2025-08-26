enum InstanceStatus {
  REQUESTED = 'requested',
  PROVISIONING = 'provisioning',
  DEPLOYING = 'deploying',
  RUNNING = 'running',
  STARTING = 'starting',
  UPDATING = 'updating',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  SCALING = 'scaling',
  BACKING_UP = 'backing_up',
  RESTORING = 'restoring',
  FAILED = 'failed',
  DELETING = 'deleting',
  DELETED = 'deleted',
  ERROR = 'error',
}
export default InstanceStatus
