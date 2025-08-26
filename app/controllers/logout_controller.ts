import AuthService from '#services/auth_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

export default class LogoutController {
  @inject()
  async handle({ response }: HttpContext, authService: AuthService) {
    await authService.logout()

    return response.redirect().toRoute('login.show')
  }
}
