import { passwordResetSendValidator, passwordResetValidator } from '#validators/auth'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PasswordResetService from '#services/password_reset_service'
import AuthService from '#services/auth_service'

@inject()
export default class ForgotPasswordsController {
  constructor(
    private passwordResetService: PasswordResetService,
    private authService: AuthService
  ) {}

  #sentSessionKey = 'FORGOT_PASSWORD_SENT'

  async index({ inertia, session }: HttpContext) {
    const isSent = session.flashMessages.has(this.#sentSessionKey)

    return inertia.render('auth/forgot_password/index', { isSent })
  }

  async send({ request, response, session }: HttpContext) {
    const data = await request.validateUsing(passwordResetSendValidator)

    await this.passwordResetService.trySendPasswordResetEmail(data.email)

    session.flash(this.#sentSessionKey, true)

    return response.redirect().back()
  }

  async reset({ params, inertia, response }: HttpContext) {
    const { isValid, user } = await this.passwordResetService.verifyPasswordResetToken(params.value)

    response.header('Referrer-Policy', 'no-referrer')

    return inertia.render('auth/forgot_password/reset', {
      value: params.value,
      email: user?.email,
      isValid,
    })
  }

  async update({ request, response, session }: HttpContext) {
    const data = await request.validateUsing(passwordResetValidator)
    const user = await this.passwordResetService.resetPassword({ data })

    await this.authService.login({ data: user })
    await this.authService.clearRateLimits(user.email)

    session.flash('success', 'Your password has been updated')

    return response.redirect().toRoute('home.index')
  }
}
