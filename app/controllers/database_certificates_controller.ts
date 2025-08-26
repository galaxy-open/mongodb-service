import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import DatabaseConnectionService from '#services/database_orchestration/helpers/database_connection_service'
import DatabaseInstanceService from '#services/database_instance/database_instance_service'
import DatabaseCertificateStorageService from '#services/database_certificate_storage_service'
import { databaseInstanceIdValidator } from '#validators/database_instances'
import ApiDatabaseScopePolicy from '#policies/api/api_database_scope_policy'
import NotFoundException from '#exceptions/not_found_exception'
import TLSModes from '#enums/tls_modes'

@inject()
export default class DatabaseCertificatesController {
  constructor(
    protected databaseConnectionService: DatabaseConnectionService,
    protected databaseInstanceService: DatabaseInstanceService,
    protected certificateStorageService: DatabaseCertificateStorageService
  ) {}

  /**
   * @show
   * @operationId downloadDatabaseCertificate
   * @summary Download database TLS certificate
   * @description Download the .crt certificate file for TLS-enabled database instances
   * @paramPath id - Database instance ID - @type(string) @required
   * @responseBody 200 - Binary certificate file
   * @responseBody 404 - Database or certificate not found
   * @responseBody 403 - Insufficient permissions
   * @responseBody 400 - TLS not enabled for this database
   */
  async show({ apiBouncer, owner, request, response }: HttpContext) {
    await apiBouncer.with(ApiDatabaseScopePolicy).authorize('read')

    const {
      params: { id },
    } = await request.validateUsing(databaseInstanceIdValidator)

    // Verify database belongs to owner
    const database = await this.databaseInstanceService.findByIdInContext({ id, ownerId: owner.id })

    if (!database) {
      throw new NotFoundException('Database not found')
    }

    const connection = await this.databaseConnectionService.getConnectionByDatabaseInstanceId(id)

    if (!connection) {
      throw new NotFoundException('Database connection not found')
    }

    if (connection.tlsMode === TLSModes.OFF) {
      return response.badRequest({ error: 'TLS is not enabled for this database' })
    }

    try {
      // Use service to download certificate
      const certificateResult = await this.certificateStorageService.downloadCertificate(database)

      // Set appropriate headers for file download
      response.header('Content-Type', certificateResult.contentType)
      response.header('Content-Disposition', `attachment; filename="${certificateResult.filename}"`)

      return response.send(certificateResult.content)
    } catch (error) {
      throw new NotFoundException('Certificate file not found')
    }
  }
}
