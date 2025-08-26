import DefaultPortRange from '#enums/default_port_range'
import RegionCodes from '#enums/region_codes'
import DatabaseConnection from '#models/database_connection'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class DatabaseConnectionRepository {
  /**
   * Retrieves a paginated list of DatabaseConnection instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<DatabaseConnection[]> {
    const result = await DatabaseConnection.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves a DatabaseConnection instance by its ID.
   */
  public async findById(id: string): Promise<DatabaseConnection | null> {
    return DatabaseConnection.find(id)
  }

  /**
   * Creates a new DatabaseConnection instance.
   */
  public async create(data: Partial<DatabaseConnection>): Promise<DatabaseConnection> {
    return DatabaseConnection.create(data)
  }

  /**
   * Updates an existing DatabaseConnection instance.
   */
  public async update(
    id: string,
    data: Partial<DatabaseConnection>
  ): Promise<DatabaseConnection | null> {
    const modelInstance = await this.findById(id)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a DatabaseConnection instance by its ID.
   */
  public async delete(id: string): Promise<void> {
    const modelInstance = await this.findById(id)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }

  /**
   * Finds a DatabaseConnection by database instance ID.
   */
  public async findByDatabaseInstanceId(
    databaseInstanceId: string
  ): Promise<DatabaseConnection | null> {
    return DatabaseConnection.findBy('database_instance_id', databaseInstanceId)
  }

  /**
   * Creates or updates a DatabaseConnection instance (upsert).
   */
  public async upsert(
    databaseInstanceId: string,
    data: Partial<DatabaseConnection>,
    trx?: TransactionClientContract
  ): Promise<DatabaseConnection> {
    const existingConnection = await this.findByDatabaseInstanceId(databaseInstanceId)

    if (existingConnection) {
      if (trx) {
        existingConnection.useTransaction(trx)
      }
      existingConnection.merge(data)
      await existingConnection.save()
      return existingConnection
    }

    const newConnection = await this.create({
      databaseInstanceId,
      ...data,
    })

    if (trx) {
      newConnection.useTransaction(trx)
      await newConnection.save()
    }

    return newConnection
  }

  public async findNextAvailablePort(regionCode: RegionCodes): Promise<number> {
    const startPort = DefaultPortRange.Start
    const endPort = DefaultPortRange.End

    // Get all used ports in a single query, sorted - join with region to filter by region code
    const connections = await DatabaseConnection.query()
      .select('port')
      .where('region_code', regionCode)
      .whereNotNull('port')
      .whereBetween('port', [startPort, endPort])
      .orderBy('port', 'asc')
      .exec()

    // Extract port numbers from the result
    const usedPorts = connections
      .map((conn) => conn.port)
      .filter((port): port is number => port !== null)

    // If no ports used, return start port
    if (usedPorts.length === 0) {
      return startPort
    }

    // Find first gap using binary search approach for better performance
    let expectedPort = startPort
    for (const usedPort of usedPorts) {
      if (usedPort !== expectedPort) {
        return expectedPort
      }
      expectedPort++
    }

    // No gap found, return next port after last used
    const nextPort = expectedPort

    if (nextPort > endPort) {
      throw new Error(`No available port found in range ${startPort}-${endPort}`)
    }

    return nextPort
  }
}
