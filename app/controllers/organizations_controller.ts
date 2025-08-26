import OrganizationService from '#services/organization_service'
import OrganizationInviteService from '#services/organization_invite_service'
import { organizationValidator } from '#validators/organization'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import NotFoundException from '#exceptions/not_found_exception'
import UserService from '#services/user_service'

@inject()
export default class OrganizationsController {
  constructor(
    protected organizationService: OrganizationService,
    protected organizationInviteService: OrganizationInviteService,
    protected userService: UserService
  ) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('organizations/index')
  }

  /**
   * Display form to create a new record
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('organizations/create')
  }

  /**
   * Handle form submission for the creation action
   */
  async store({ request, response, auth }: HttpContext) {
    const data = await request.validateUsing(organizationValidator)
    const organization = await this.organizationService.store({
      user: auth.use('web').user!,
      data,
    })

    await this.organizationService.setActive(organization.id)

    return response.redirect().toRoute('home.index')
  }

  /**
   * Set active organization
   */
  async active({ response, params }: HttpContext) {
    await this.organizationService.setActive(params.id)

    return response.redirect().toRoute('home.index')
  }

  /**
   * Handle form submission for the edit action
   */
  async update({ params, request, response, session }: HttpContext) {
    const data = await request.validateUsing(organizationValidator)

    await this.organizationService.update({
      id: params.id,
      data,
    })

    session.flash('success', 'Your organization has been updated')

    return response.redirect().back()
  }

  async acceptInvite({ request, response, auth, params, session }: HttpContext) {
    await auth.use('web').check()

    const user = auth.use('web').user

    if (!request.hasValidSignature()) {
      session.flash('errorsBag', 'An invalid invitation URL was provided')
      return user
        ? response.redirect().toRoute('home.index')
        : response.redirect().toRoute('login.show')
    }

    if (!user) {
      const invite = await this.organizationInviteService.findById(params.id)

      if (!invite) {
        throw new NotFoundException('Invite not found')
      }

      const isUser = await this.userService.findByEmail(invite.email)

      session.put('invite_id', invite.id)

      return isUser
        ? response.redirect().toRoute('login.show')
        : response.redirect().toRoute('register.show')
    }

    const result = await this.organizationInviteService.acceptInvite({
      inviteId: params.id,
      user,
    })

    session.forget('invite_id')
    session.flash(result.state, result.message)

    return response.redirect().toRoute('home.index')
  }

  /**
   * Delete record
   */
  async destroy({ params, response, session }: HttpContext) {
    await this.organizationService.destroy(params.id)

    session.flash('success', 'Your organization has been deleted')

    return response.redirect().toRoute('home.index')
  }
}
