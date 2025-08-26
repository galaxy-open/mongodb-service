import Organization from '#models/organization'
import OrganizationInvite from '#models/organization_invite'
import User from '#models/user'
import env from '#start/env'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { Logger } from '@adonisjs/core/logger'
import router from '@adonisjs/core/services/router'
import mail from '@adonisjs/mail/services/main'

interface SendPasswordResetEmailParams {
  user: User
  resetLink: string
}

interface SendEmailNotificationParams {
  user: User
  emailOld: string
}

interface SendOrganizationInviteParams {
  invite: OrganizationInvite
  organization: Organization
  invitedUser: User
}

@inject()
export default class EmailService {
  constructor(
    protected ctx: HttpContext,
    private logger: Logger
  ) {}

  public async sendPasswordResetEmail(params: SendPasswordResetEmailParams) {
    this.logger.info(`Sending password reset email to: ${params.user.email}`)
    try {
      await mail.send((message) => {
        message
          .to(params.user.email)
          .from('onboarding@resend.dev')
          .subject('Reset Your Password')
          .htmlView('emails/forgot_password', {
            user: params.user,
            resetLink: params.resetLink,
          })
      })
      this.logger.info(`Password reset email sent to: ${params.user.email}`)
    } catch (error) {
      this.logger.error(`Error sending password reset email to: ${params.user.email}`, {
        error: JSON.stringify(error),
      })
    }
  }

  public async sendEmailNotification(params: SendEmailNotificationParams) {
    await mail.sendLater((message) => {
      message
        .to(params.emailOld)
        .subject('Your email has been successfully changed')
        .htmlView('emails/email_change', { user: params.user })
    })
  }

  public async sendOrganizationInvite(params: SendOrganizationInviteParams) {
    const inviteUrl = router
      .builder()
      .params({ id: params.invite.id })
      .prefixUrl(env.get('APP_URL'))
      .makeSigned('organizations.invites.accept')

    await mail.sendLater((message) => {
      message
        .to(params.invite.email)
        .subject(`You have been invited to join ${params.organization.username}`)
        .htmlView('emails/organization_invite', {
          organization: params.organization,
          invitedUser: params.invitedUser,
          inviteUrl,
        })
    })
  }
}
