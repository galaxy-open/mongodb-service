import Organization from '#models/organization'
import { organizationInviteValidator } from '#validators/organization'
import UserRepository from '#repositories/user_repository'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { Infer } from '@vinejs/vine/types'
import OrganizationInviteRepository from '#repositories/organization_invite_repository'
import EmailService from '#services/email_service'
import User from '#models/user'
import ForbiddenException from '#exceptions/forbidden_exception'
import NotFoundException from '#exceptions/not_found_exception'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

interface SendInviteParams {
  organization: Organization
  invitedByUserId: string
  data: Infer<typeof organizationInviteValidator>
}

interface CancelInviteParams {
  organization: Organization
  canceledByUserId: string
  inviteId: string
}

interface AcceptInviteParams {
  inviteId: string
  user: User
}

@inject()
export default class OrganizationInviteService {
  constructor(
    private organizationInviteRepository: OrganizationInviteRepository,
    private userRepository: UserRepository,
    private emailService: EmailService,
    protected ctx: HttpContext
  ) {}

  public async findById(id: string) {
    return this.organizationInviteRepository.findById(id)
  }

  public async sendInvite(params: SendInviteParams) {
    const invite = await this.organizationInviteRepository.create({
      organizationId: params.organization.id,
      invitedByUserId: params.invitedByUserId,
      ...params.data,
    })

    const invitedUser = await this.userRepository.findByEmail(invite.email)

    if (!invitedUser) {
      return
    }

    await this.emailService.sendOrganizationInvite({
      invite,
      organization: params.organization,
      invitedUser,
    })
  }

  public async getPendingInvites(organization: Organization) {
    return this.organizationInviteRepository.getPendingInvites(organization)
  }

  public async cancelInvite(params: CancelInviteParams) {
    return this.organizationInviteRepository.cancelInvite(
      params.organization,
      params.canceledByUserId,
      params.inviteId
    )
  }

  public async acceptInvite(params: AcceptInviteParams) {
    const invite = await this.organizationInviteRepository.findById(params.inviteId)

    if (!invite) {
      throw new NotFoundException('Invite not found')
    }

    if (invite.email !== params.user.email) {
      throw new ForbiddenException('Your email does not match the invitation')
    }

    if (invite.acceptedAt || invite.canceledAt) {
      return {
        invite: null,
        state: 'errorsBag',
        message: 'This invitation is no longer valid',
      }
    }

    await db.transaction(async (trx) => {
      invite.useTransaction(trx)

      const organization = await invite.related('organization').query().first()
      if (!organization) {
        throw new Error(`Organization with inviteId ${invite.id} not found`)
      }

      await organization.related('users').attach({
        [params.user.id]: {
          role_name: invite.roleName,
        },
      })

      invite.acceptedAt = DateTime.now()

      await invite.save()
    })

    return {
      invite,
      state: 'success',
      message: 'Invitation successfully accepted',
    }
  }
}
