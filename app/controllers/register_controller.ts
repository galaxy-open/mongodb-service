import OrganizationInvite from '#models/organization_invite'
import AuthService from '#services/auth_service'
import { registerValidator } from '#validators/auth'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { sanitizeContinueUrl } from '#validators/helpers/continue_url'

@inject()
export default class RegisterController {
  constructor(private authService: AuthService) {}

  async show({ inertia, session, request }: HttpContext) {
    const inviteId = session.get('invite_id')
    const continueUrl = sanitizeContinueUrl(request.input('continue'))

    if (inviteId) {
      const invite = await OrganizationInvite.find(inviteId)
      if (!invite) {
        session.forget('invite_id')
      } else {
        inertia.share({ invite: invite.serialize() })
      }
    }

    return inertia.render('auth/register', { continueUrl })
  }

  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)
    const { invite } = await this.authService.register({ data })

    const continueUrl = sanitizeContinueUrl(request.input('continue'))
    if (continueUrl) {
      return response.redirect(continueUrl)
    }

    if (invite) {
      return response.redirect().toRoute('organizations.index')
    }

    return response.redirect().toRoute('organizations.create')
  }
}
