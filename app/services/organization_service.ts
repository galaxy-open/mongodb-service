import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import OrganizationRepository from '#repositories/organization_repository'
import { organizationValidator } from '#validators/organization'
import { Infer } from '@vinejs/vine/types'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { activeCookieName } from '#config/organization'
import Organization from '#models/organization'

interface UpdateOrganizationParams {
  id: string
  data: Infer<typeof organizationValidator>
}

interface StoreOrganizationParams {
  user: User
  data: Infer<typeof organizationValidator>
}

interface RemoveUserFromOrganizationParams {
  organization: Organization
  removeUserId: number
}

interface GetUserRoleInOrganizationParams {
  organizationId: number | string
  userId: number | string
}

@inject()
export default class OrganizationService {
  constructor(
    protected ctx: HttpContext,
    private organizationRepository: OrganizationRepository
  ) {}

  public async update(params: UpdateOrganizationParams) {
    return this.organizationRepository.update(params.id, params.data)
  }

  public async store(params: StoreOrganizationParams) {
    return db.transaction(async (trx) => {
      const organization = await this.organizationRepository.create(params.data, trx)
      await this.organizationRepository.assignAdmin(organization, params.user.id)

      return organization
    })
  }

  public async setActive(id: string) {
    this.ctx.organizationId = id
    this.ctx.response.cookie(activeCookieName, id)
  }

  public async getActive(userId: number | string) {
    const activeId = this.ctx.organizationId!

    const organization = await this.organizationRepository.getActive(userId, activeId)

    if (!activeId || organization!.id !== activeId) {
      this.setActive(organization!.id)
    }

    return organization
  }

  public async removeUser(params: RemoveUserFromOrganizationParams) {
    await this.organizationRepository.removeUser(params.organization, params.removeUserId)
  }

  public async getUsers(organization: Organization) {
    return this.organizationRepository.getUsers(organization)
  }

  public async getUserRoleId(params: GetUserRoleInOrganizationParams) {
    return this.organizationRepository.getUserRoleId(params.organizationId, params.userId)
  }

  public async destroy(organizationId: string) {
    await this.organizationRepository.delete(organizationId)
  }
}
