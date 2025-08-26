import SettingService from '#services/setting_service'
import { updateProfileValidator } from '#validators/setting'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SettingsProfilesController {
  constructor(private settingService: SettingService) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('settings/profile')
  }

  async update({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(updateProfileValidator)
    const user = auth.use('web').user!

    await this.settingService.updateUserProfile({
      userId: user.id,
      data,
    })

    session.flash('success', 'Your profile has been updated')

    return response.redirect().back()
  }
}
