import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import encryption from '@adonisjs/core/services/encryption'
import PasswordResetTokenRepository from '#repositories/password_reset_token_repository'
import { passwordResetValidator } from '#validators/auth'
import { Infer } from '@vinejs/vine/types'
import { Exception } from '@adonisjs/core/exceptions'
import UserRepository from '#repositories/user_repository'
import string from '@adonisjs/core/helpers/string'
import { Logger } from '@adonisjs/core/logger'
import router from '@adonisjs/core/services/router'
import env from '#start/env'
import EmailService from '#services/email_service'
import { DateTime } from 'luxon'

interface ResetPasswordParams {
  data: Infer<typeof passwordResetValidator>
}

@inject()
export default class PasswordResetService {
  constructor(
    private passwordResetTokenRepository: PasswordResetTokenRepository,
    private userRepository: UserRepository,
    private logger: Logger,
    protected ctx: HttpContext,
    private emailService: EmailService
  ) {}

  public async verifyPasswordResetToken(encryptedValue: string) {
    const value = encryption.decrypt(encryptedValue) as string
    const { token, user } = await this.passwordResetTokenRepository.findByValue(value)

    return {
      isValid: token?.isValid,
      token,
      user,
    }
  }

  public async resetPassword(params: ResetPasswordParams) {
    const { isValid, user } = await this.verifyPasswordResetToken(params.data.value)

    if (!isValid) {
      throw new Exception('The password reset token provided is invalid or expired', {
        status: 403,
        code: 'E_UNAUTHORIZED',
      })
    }

    await this.userRepository.update(user!.id, { password: params.data.password })
    await this.passwordResetTokenRepository.expire(user!.id)

    return user!
  }

  public async trySendPasswordResetEmail(email: string) {
    const user = await this.userRepository.findByEmail(email)
    const value = string.generateRandom(32)
    const encryptedValue = encryption.encrypt(value)

    if (!user) {
      this.logger.info(`User with email not found: ${email}`)
      return
    }

    await this.passwordResetTokenRepository.expire(user.id)
    await this.passwordResetTokenRepository.create({
      userId: user.id,
      value,
      expiresAt: DateTime.now().plus({ hour: 1 }),
    })

    const resetLink = router
      .builder()
      .prefixUrl(env.get('APP_URL'))
      .params({ value: encryptedValue })
      .make('forgot_password.reset')

    await this.emailService.sendPasswordResetEmail({ user, resetLink })
  }
}
