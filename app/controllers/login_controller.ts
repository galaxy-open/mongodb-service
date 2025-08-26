import AuthService from '#services/auth_service'
import { loginValidator } from '#validators/auth'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { sanitizeContinueUrl } from '#validators/helpers/continue_url'

export default class LoginController {
  async show({ inertia, request }: HttpContext) {
    const continueUrl = sanitizeContinueUrl(request.input('continue'))
    return inertia.render('auth/login', { continueUrl })
  }

  @inject()
  async store({ request, response }: HttpContext, authService: AuthService) {
    const { continueUrl, ...data } = await request.validateUsing(loginValidator)
    const user = await authService.login({ data })

    if (!user) {
      return response.redirect().back()
    }

    const sanitizedContinueUrl = sanitizeContinueUrl(continueUrl)
    if (sanitizedContinueUrl) {
      return response.redirect(sanitizedContinueUrl)
    }

    return response.redirect().toRoute('home.index')
  }
}
