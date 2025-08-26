import RoleRepository from '#repositories/role_repository'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class RoleService {
  constructor(
    private roleRepository: RoleRepository,
    protected ctx: HttpContext
  ) {}

  public async findAll() {
    return this.roleRepository.findAll()
  }
}
