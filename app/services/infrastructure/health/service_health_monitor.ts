import { Logger } from '@adonisjs/core/logger'
import { inject } from '@adonisjs/core'
import DockerCliService from '#services/docker_cli/docker_cli_service'
import RetryHelper from '#services/utilities/retry_helper'
import DockerSwarmManager from '#models/docker_swarm_manager'

/**
 * Configuration for Docker Swarm service health monitoring.
 */
export interface ServiceHealthConfig {
  stackName: string
  serviceName: string
  timeoutMs?: number
  checkIntervalMs?: number
}

/**
 * Result of a Docker Swarm service health check.
 */
export interface ServiceHealthResult {
  healthy: boolean
  reason: string
  replicas?: number
  desiredReplicas?: number
  runningTasks?: number
}

/**
 * Service that monitors Docker Swarm service health using native Docker commands.
 * Replaces netcat-based health checking with Docker Swarm service inspection.
 */
@inject()
export default class ServiceHealthMonitor {
  // Default timeout constants
  private static readonly DEFAULT_HEALTH_CHECK_TIMEOUT = 300000 // 5 minutes
  private static readonly DEFAULT_HEALTH_CHECK_INTERVAL = 10000 // 10 seconds

  constructor(
    protected logger: Logger,
    protected dockerCliService: DockerCliService,
    private retryHelper: RetryHelper
  ) {}

  /**
   * Wait for a Docker Swarm service to become healthy with timeout and retry logic.
   *
   * @param cluster
   * @param config - Service health configuration
   * @returns Promise<boolean> - true if service becomes healthy, false if timeout
   */
  async waitForServiceHealthy(
    cluster: DockerSwarmManager,
    config: ServiceHealthConfig
  ): Promise<boolean> {
    const {
      stackName,
      serviceName: service,
      timeoutMs: timeout = ServiceHealthMonitor.DEFAULT_HEALTH_CHECK_TIMEOUT,
      checkIntervalMs: checkInterval = ServiceHealthMonitor.DEFAULT_HEALTH_CHECK_INTERVAL,
    } = config

    const maxAttempts = Math.ceil(timeout / checkInterval)

    this.logger.info('Starting service health monitoring')

    try {
      await this.retryHelper.execute(
        async () => {
          const healthResult = await this.checkServiceHealth(cluster, stackName, service)

          if (!healthResult.healthy) {
            throw new Error(healthResult.reason)
          }

          return healthResult
        },
        {
          maxAttempts,
          delayMs: checkInterval,
          operation: `${stackName}/${service} service health check`,
        }
      )

      return true
    } catch (error) {
      this.logger.error(
        { stackName, serviceName: service, maxAttempts, timeout },
        'Service health check failed after all attempts'
      )
      return false
    }
  }

  /**
   * Check the health of a specific Docker Swarm service.
   *
   * @param cluster
   * @param stackName - Name of the Docker stack
   * @param serviceName - Name of the service to check
   * @returns Promise<ServiceHealthResult> - Health status and details
   */
  async checkServiceHealth(
    cluster: DockerSwarmManager,
    stackName: string,
    serviceName: string
  ): Promise<ServiceHealthResult> {
    try {
      // Get service information from Docker Swarm
      const services = await this.dockerCliService.run(cluster, (docker) =>
        docker.stackServices(stackName)
      )

      const targetService = services.find((s) => s.Name === serviceName)

      if (!targetService) {
        this.logger.warn(
          {
            stackName,
            serviceName,
            availableServices: services.map((s) => s.Name),
          },
          'Service not found in stack'
        )
        return {
          healthy: false,
          reason: `Service '${serviceName}' not found in stack '${stackName}'. Available services: ${services.map((s) => s.Name).join(', ')}`,
        }
      }

      // Get detailed service inspection
      const serviceInspection = await this.dockerCliService.run(cluster, (docker) =>
        docker.serviceInspect(serviceName)
      )

      this.logger.debug(
        {
          serviceName,
          serviceSpec: serviceInspection.Spec,
          serviceMode: serviceInspection.Spec?.Mode,
          serviceEndpoint: serviceInspection.Endpoint,
        },
        'Service inspection details'
      )

      // Check service convergence (replicas match desired)
      // Parse replicas format: "1/1" means current/desired
      const [currentReplicas, desiredReplicas] = targetService.Replicas.split('/').map(Number)
      const isConverged = currentReplicas === desiredReplicas

      if (!isConverged) {
        // Get task details to understand why not converging
        const serviceTasks = await this.dockerCliService.run(cluster, (docker) =>
          docker.servicePs(serviceName)
        )

        // Get node information to understand availability
        const nodeInfo = await this.dockerCliService.run(cluster, (docker) => docker.nodeLs())

        // Get all services in the stack to see distribution
        const allStackServices = await Promise.all(
          services.map(async (svc) => {
            const tasks = await this.dockerCliService.run(cluster, (docker) =>
              docker.servicePs(svc.Name)
            )
            return {
              service: svc.Name,
              replicas: svc.Replicas,
              nodePlacement: tasks
                .filter((t) => t.CurrentState.startsWith('Running'))
                .map((t) => ({ node: t.Node, taskId: t.ID })),
            }
          })
        )

        // Log comprehensive debugging information
        this.logger.warn(
          {
            serviceName,
            currentReplicas,
            desiredReplicas,
            nodeAvailability: {
              totalNodes: nodeInfo.length,
              readyNodes: nodeInfo.filter((n) => n.Status === 'Ready').length,
              activeNodes: nodeInfo.filter((n) => n.Availability === 'Active').length,
              nodeDetails: nodeInfo.map((n) => ({
                hostname: n.Hostname,
                status: n.Status,
                availability: n.Availability,
                role: n.ManagerStatus ? 'manager' : 'worker',
              })),
            },
            serviceDistribution: allStackServices,
            tasks: serviceTasks.map((task) => ({
              id: task.ID,
              node: task.Node,
              currentState: task.CurrentState,
              desiredState: task.DesiredState,
              error: task.Error,
            })),
          },
          'Service not converged - comprehensive cluster state'
        )

        // Get logs from failed tasks if any
        const failedTasks = serviceTasks.filter(
          (task) => task.Error || task.CurrentState.includes('Failed')
        )

        for (const task of failedTasks) {
          try {
            const taskLogs = await this.dockerCliService.run(cluster, (docker) =>
              docker.serviceLogs(serviceName, { tail: 50 })
            )
            this.logger.error(
              {
                serviceName,
                taskId: task.ID,
                taskError: task.Error,
                taskState: task.CurrentState,
                logs: taskLogs.stdout || taskLogs.stderr,
              },
              'Failed task logs'
            )
          } catch (logError) {
            this.logger.error(
              {
                serviceName,
                taskId: task.ID,
                error: logError.message,
              },
              'Failed to retrieve task logs'
            )
          }
        }

        return {
          healthy: false,
          reason: `Service not converged: ${currentReplicas}/${desiredReplicas} replicas`,
          replicas: currentReplicas,
          desiredReplicas: desiredReplicas,
        }
      }

      // Check task health
      const serviceTasks = await this.dockerCliService.run(cluster, (docker) =>
        docker.servicePs(serviceName)
      )

      const runningTasks = serviceTasks.filter(
        (task) => task.CurrentState.startsWith('Running') && task.DesiredState === 'Running'
      )

      const hasRunningTasks = runningTasks.length > 0

      if (!hasRunningTasks) {
        // Log all task details when no running tasks
        this.logger.warn(
          {
            serviceName,
            totalTasks: serviceTasks.length,
            runningTasks: runningTasks.length,
            taskDetails: serviceTasks.map((task) => ({
              id: task.ID,
              node: task.Node,
              currentState: task.CurrentState,
              desiredState: task.DesiredState,
              error: task.Error,
            })),
          },
          'No running tasks found - detailed task breakdown'
        )

        // Try to get service logs for debugging
        try {
          const serviceLogs = await this.dockerCliService.run(cluster, (docker) =>
            docker.serviceLogs(serviceName, { tail: 100 })
          )
          this.logger.error(
            {
              serviceName,
              logs: serviceLogs.stdout || serviceLogs.stderr,
            },
            'Service logs for debugging'
          )
        } catch (logError) {
          this.logger.error(
            {
              serviceName,
              error: logError.message,
            },
            'Failed to retrieve service logs'
          )
        }

        return {
          healthy: false,
          reason: `No running tasks found. Task states: ${serviceTasks.map((t) => `${t.CurrentState}/${t.DesiredState}`).join(', ')}`,
          replicas: currentReplicas,
          desiredReplicas: desiredReplicas,
          runningTasks: runningTasks.length,
        }
      }

      // Service is healthy if converged and has running tasks
      this.logger.info(
        `Service is healthy ${serviceName} with ${targetService.Replicas} replicas and ${runningTasks.length} running tasks`
      )

      return {
        healthy: true,
        reason: 'Service converged with running tasks',
        replicas: currentReplicas,
        desiredReplicas: desiredReplicas,
        runningTasks: runningTasks.length,
      }
    } catch (error) {
      this.logger.error({ error, stackName, serviceName }, 'Failed to check service health')
      return {
        healthy: false,
        reason: `Health check failed: ${error.message}`,
      }
    }
  }

  /**
   * Wait for multiple services to become healthy.
   * Useful for replica sets or multiservice deployments.
   *
   * @param cluster
   * @param healthConfigs - Array of service health configurations
   * @returns Promise<boolean> - true if all services become healthy
   */
  async waitForMultipleServicesHealthy(
    cluster: DockerSwarmManager,
    healthConfigs: ServiceHealthConfig[]
  ): Promise<boolean> {
    const healthChecks = healthConfigs.map((config) => this.waitForServiceHealthy(cluster, config))

    const results = await Promise.all(healthChecks)
    return results.every((result) => result === true)
  }
}
