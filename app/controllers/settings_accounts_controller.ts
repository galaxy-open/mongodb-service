import { updateEmailValidator } from '#validators/setting'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import AuthService from '#services/auth_service'
import SettingService from '#services/setting_service'

@inject()
export default class SettingsAccountsController {
  constructor(
    private settingService: SettingService,
    private authService: AuthService
  ) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('settings/account')
  }

  async updateEmail({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(updateEmailValidator)
    const user = auth.use('web').user!

    if (data.email === user.email) {
      session.flash('success', 'You are already using the submitted email')
      return response.redirect().back()
    }

    await this.settingService.updateUserEmail({
      user,
      data,
    })

    session.flash('success', 'Your email has been updated')

    return response.redirect().back()
  }

  async destroy({ request, response, session, auth }: HttpContext) {
    const user = auth.use('web').user!
    const validator = vine.compile(
      vine.object({
        email: vine.string().in([user.email]),
      })
    )
    await request.validateUsing(validator)

    await this.settingService.destroyUserAccount(user.id)

    await this.authService.logout()

    session.flash('success', 'Your account has been deleted')

    return response.redirect().toRoute('register.show')
  }
}
