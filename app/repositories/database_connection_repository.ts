import DatabaseConnection from '#models/database_connection'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'
import RegionCodes from '#enums/region_codes'
import DefaultPortRange from '#enums/default_port_range'

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

  /**
   * Get the highest used port in a region
   */
  public async getHighestUsedPort(regionCode: RegionCodes): Promise<number | null> {
    const startPort = DefaultPortRange.Start
    const endPort = DefaultPortRange.End

    const result = await DatabaseConnection.query()
      .select('port')
      .where('region_code', regionCode)
      .whereNotNull('port')
      .whereBetween('port', [startPort, endPort])
      .orderBy('port', 'desc')
      .limit(1)
      .first()

    return result?.port || null
  }

  /**
   * Get all used ports in a region
   */
  public async getUsedPorts(regionCode: RegionCodes): Promise<number[]> {
    const startPort = DefaultPortRange.Start
    const endPort = DefaultPortRange.End

    const results = await DatabaseConnection.query()
      .select('port')
      .where('region_code', regionCode)
      .whereNotNull('port')
      .whereBetween('port', [startPort, endPort])
      .orderBy('port', 'asc')

    return results.map((r) => r.port).filter((port): port is number => port !== null)
  }
}
