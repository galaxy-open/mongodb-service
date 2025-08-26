/*
|--------------------------------------------------------------------------
| API Routes (/api/v1)
|--------------------------------------------------------------------------
|
| RESTful API routes for external integrations.
| All routes require Bearer token authentication via OAuth.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
const InstanceSizesController = () => import('#controllers/instance_sizes_controller')

const HealthChecksController = () => import('#controllers/health_checks_controller')

const DatabaseInstancesController = () => import('#controllers/database_instances_controller')
const DatabaseConnectionsController = () => import('#controllers/database_connections_controller')
const DatabaseCertificatesController = () => import('#controllers/database_certificates_controller')
const DatabaseVersionsController = () => import('#controllers/database_versions_controller')
const DatabaseInstanceMetricsController = () =>
  import('#controllers/database_instance_metrics_controller')
const DatabaseLogsController = () => import('#controllers/database_logs_controller')
const DatabaseQueryInsightsController = () =>
  import('#controllers/database_query_insights_controller')

// API v1 routes with oauth token authentication
router
  .group(() => {
    router.get('/database', [DatabaseInstancesController, 'index']).as('database.index')
    router.post('/database', [DatabaseInstancesController, 'store']).as('database.store')
    router.get('/database/:id', [DatabaseInstancesController, 'show']).as('database.show')
    router
      .get('/database/:id/connection', [DatabaseConnectionsController, 'show'])
      .as('database.connection')
    router
      .get('/database/:id/certificate', [DatabaseCertificatesController, 'show'])
      .as('database.certificate')
    router
      .get('/database/:id/metrics', [DatabaseInstanceMetricsController, 'show'])
      .as('database.metrics')
    router.get('/database/:id/logs', [DatabaseLogsController, 'show']).as('database.logs')
    router
      .get('/database/:id/query-insights', [DatabaseQueryInsightsController, 'show'])
      .as('database.query-insights')
    router.put('/database/:id', [DatabaseInstancesController, 'update']).as('database.update')
    router.delete('/database/:id', [DatabaseInstancesController, 'destroy']).as('database.destroy')
    router.get('/database/stats', [DatabaseInstancesController, 'stats']).as('database.stats')

    router
      .get('/database-versions', [DatabaseVersionsController, 'index'])
      .as('database-versions.index')
    router.get('/instance-sizes', [InstanceSizesController, 'index']).as('instance-sizes.index')
  })
  .prefix('/api/v1')
  .use([middleware.api()])

router.get('/health', [HealthChecksController]).use(middleware.health()).prefix('/api/v1')
