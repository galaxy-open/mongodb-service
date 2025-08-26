/**
 * Database configuration constants.
 * Contains only the essential values used throughout the database services.
 */
export const DatabaseConstants = {
  /**
   * Default database users for different operational needs.
   */
  DEFAULT_USERS: {
    ADMIN: 'galaxyadmin',
    MONITOR: 'galaxymonitor',
    BACKUP: 'galaxybackup',
    USER_ADMIN: 'admin',
  },

  /**
   * Timeout configurations for MongoDB operations (in milliseconds).
   */
  TIMEOUTS: {
    // Connection retry settings
    CONNECTION_RETRY_DURATION: 60000, // 60 seconds
    CONNECTION_RETRY_INTERVAL: 10000, // 10 seconds

    // Health check settings
    HEALTH_CHECK: 60000, // 60 seconds
    HEALTH_CHECK_INTERVAL: 10000, // 10 seconds

    // Validation settings
    VALIDATION_RETRY_DELAY: 5000, // 5 seconds
    VALIDATION_RETRY_ATTEMPTS: 30, // Total attempts for validation (including the first attempt)

    // Post-connection stabilization delay
    POST_CONNECTION_DELAY: 5000, // 5 seconds

    // Replica set election
    PRIMARY_ELECTION_TIMEOUT: 60000, // 60 seconds
    PRIMARY_ELECTION_INTERVAL: 10000, // 10 seconds

    // Connection client timeouts
    CLIENT_SERVER_SELECTION_TIMEOUT: 10000, // 10 seconds
    CLIENT_CONNECT_TIMEOUT: 10000, // 10 seconds
    CLIENT_SOCKET_TIMEOUT: 10000, // 10 seconds
    CLIENT_LONG_RUNNING_TIMEOUT: 60000, // 60 seconds
    CLIENT_LONG_RUNNING_SOCKET_TIMEOUT: 60000, // 1 minute
  },

  MONGODB: {
    SERVICE_NAMES: {
      STANDALONE: (stackName: string) => `${stackName}_standalone`,
    },
    ROLES: {
      CLUSTER_MONITOR: 'clusterMonitor',
      READ: 'read',
      USER_ADMIN_ANY_DATABASE: 'userAdminAnyDatabase',
      BACKUP: 'backup',
      ROOT: 'root',
      READ_WRITE: 'readWrite',
      DB_ADMIN: 'dbAdmin',
    },
    DATABASES: {
      ADMIN: 'admin',
      LOCAL: 'local',
    },
  },
} as const
