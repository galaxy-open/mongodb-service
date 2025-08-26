import User from '#models/user'
import UserRepository from '#repositories/user_repository'
import { updateEmailValidator, updateProfileValidator } from '#validators/setting'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { HttpContext } from '@adonisjs/core/http'
import { Infer } from '@vinejs/vine/types'
import EmailService from '#services/email_service'
import OrganizationRepository from '#repositories/organization_repository'

interface UpdateUserEmailParams {
  user: User
  data: Infer<typeof updateEmailValidator>
}

interface UpdateUserProfileParams {
  userId: string
  data: Infer<typeof updateProfileValidator>
}

@inject()
export default class SettingService {
  constructor(
    protected ctx: HttpContext,
    private userRepository: UserRepository,
    private organizationRepository: OrganizationRepository,
    private emailService: EmailService
  ) {}

  public async updateUserEmail(params: UpdateUserEmailParams) {
    const emailOld = params.user.email

    await this.userRepository.verifyCredentials(emailOld, params.data.password)
    await this.userRepository.update(params.user.id, { email: params.data.email })

    await this.emailService.sendEmailNotification({ user: params.user, emailOld })

    return params.user
  }

  public async destroyUserAccount(userId: string) {
    await db.transaction(async (trx) => {
      const user = await this.userRepository.findById(userId)
      if (!user) {
        return
      }
      user.useTransaction(trx)

      await this.organizationRepository.deleteDanglingOrganizations(user.id, trx)
      await user.delete()
    })
  }

  public async updateUserProfile(params: UpdateUserProfileParams) {
    return this.userRepository.update(params.userId, params.data)
  }
}
