import UserRoles from '#enums/user_roles'
import Role from '#models/role'

export default class RoleRepository {
  /**
   * Retrieves a paginated list of Role instances.
   */
  public async findAll(page: number = 1, limit: number = 10): Promise<Role[]> {
    const result = await Role.query().paginate(page, limit)
    return result.all()
  }

  /**
   * Retrieves a Role instance by its name (primary key).
   */
  public async findById(name: UserRoles): Promise<Role | null> {
    return Role.find(name)
  }

  /**
   * Retrieves a Role instance by its name.
   */
  public async findByName(name: UserRoles): Promise<Role | null> {
    return Role.findBy('name', name)
  }

  /**
   * Creates a new Role instance.
   */
  public async create(data: Partial<Role>): Promise<Role> {
    return Role.create(data)
  }

  /**
   * Updates an existing Role instance.
   */
  public async update(name: UserRoles, data: Partial<Role>): Promise<Role | null> {
    const modelInstance = await this.findById(name)
    if (!modelInstance) {
      return null
    }
    modelInstance.merge(data)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Deletes a Role instance by its name.
   */
  public async delete(name: UserRoles): Promise<void> {
    const modelInstance = await this.findById(name)
    if (modelInstance) {
      await modelInstance.delete()
    }
  }
}
