import OrganizationInviteService from '#services/organization_invite_service'
import OrganizationService from '#services/organization_service'
import RoleService from '#services/role_service'
import { withOrganizationMetaData } from '#validators/helpers/organizations'
import { organizationInviteValidator } from '#validators/organization'
import { inject } from '@adonisjs/core/container'
import type { HttpContext } from '@adonisjs/core/http'
import { setTimeout } from 'node:timers/promises'

@inject()
export default class SettingsOrganizationsController {
  constructor(
    private organizationInviteService: OrganizationInviteService,
    private organizationService: OrganizationService,
    private roleService: RoleService
  ) {}

  async index({ inertia, organization }: HttpContext) {
    return inertia.render('settings/organization', {
      users: inertia.defer(async () => {
        const users = await this.organizationService.getUsers(organization)
        return users.map((user) => user.serialize())
      }),
      invites: inertia.optional(async () => {
        await setTimeout(5_000)
        const pendingInvites = await this.organizationInviteService.getPendingInvites(organization)
        return pendingInvites.map((invite) => invite.serialize())
      }),
      roles: async () => {
        const roles = await this.roleService.findAll()
        return roles.map((role) => role.serialize())
      },
    })
  }

  async inviteUser({ request, response, organization, session, auth }: HttpContext) {
    const data = await request.validateUsing(
      organizationInviteValidator,
      withOrganizationMetaData(organization.id)
    )

    await this.organizationInviteService.sendInvite({
      organization,
      invitedByUserId: auth.use('web').user!.id,
      data,
    })

    session.flash('success', 'Invitation has been sent')

    return response.redirect().back()
  }

  async cancelInvite({ response, organization, params, session, auth }: HttpContext) {
    await this.organizationInviteService.cancelInvite({
      organization,
      canceledByUserId: auth.use('web').user!.id,
      inviteId: params.id,
    })

    session.flash('success', 'The invitation has been canceled')

    return response.redirect().back()
  }

  async removeUser({ response, organization, params, session }: HttpContext) {
    await this.organizationService.removeUser({
      organization,
      removeUserId: params.id,
    })

    session.flash('success', 'member has been successfully removed')

    return response.redirect().back()
  }
}
