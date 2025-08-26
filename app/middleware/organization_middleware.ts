import { activeCookieName } from '#config/organization'
import Organization from '#models/organization'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import OrganizationService from '#services/organization_service'

@inject()
export default class OrganizationMiddleware {
  constructor(protected organizationService: OrganizationService) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.use('web').user!

    try {
      ctx.organizationId = ctx.request.cookie(activeCookieName)

      const organization = await this.organizationService.getActive(user.id)
      const roleId = await this.organizationService.getUserRoleId({
        organizationId: organization!.id,
        userId: user.id,
      })

      ctx.organization = organization!
      ctx.roleId = roleId
    } catch (_) {
      ctx.session.reflash()
      return ctx.response.redirect().toRoute('organizations.create')
    }

    const organizations = await user.related('organizations').query().orderBy('name')

    ctx.inertia.share({
      organization: ctx.organization.serialize(),
      organizations: organizations.map((organization) => organization.serialize()),
    })

    return await next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    organizationId?: number | string
    organization: Organization
    roleId: number
  }
}
