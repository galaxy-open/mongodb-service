import { inject } from '@adonisjs/core'
import UserRepository from '#repositories/user_repository'
import User from '#models/user'
import { Infer } from '@vinejs/vine/types'
import { loginValidator, registerValidator } from '#validators/auth'
import limiter from '@adonisjs/limiter/services/main'
import { HttpContext } from '@adonisjs/core/http'
import OrganizationInviteService from '#services/organization_invite_service'

interface LoginParams {
  data: Infer<typeof loginValidator>
}

interface RegisterParams {
  data: Infer<typeof registerValidator>
}

@inject()
export default class AuthService {
  constructor(
    private userRepository: UserRepository,
    private organizationInviteService: OrganizationInviteService,
    protected ctx: HttpContext
  ) {}

  get #limit() {
    return limiter.use({
      requests: 30,
      duration: '1 hour',
      blockDuration: '1 hour',
    })
  }

  public async login(params: LoginParams) {
    const key = this.#getRateKey(params.data.email)

    if (!params.data.password) {
      this.ctx.session.flashAll()
      this.ctx.session.flashErrors({
        E_INVALID_PASSWORD: 'Invalid password',
      })
      return null
    }

    const [error, user] = await this.#limit.penalize(key, () => {
      return this.userRepository.verifyCredentials(params.data.email, params.data.password!)
    })

    if (error) {
      this.ctx.session.flashAll()
      this.ctx.session.flashErrors({
        E_TOO_MANY_REQUESTS: 'Too many login attempts, please try again later',
      })
      return null
    }

    await this.ctx.auth.use('web').login(user, params.data.remember)
    await this.#checkForOrganizationInvite(user)

    return user
  }

  public async logout() {
    await this.ctx.auth.use('web').logout()
  }

  public async register(params: RegisterParams) {
    const user = await User.create(params.data)

    await this.ctx.auth.use('web').login(user)

    const invite = await this.#checkForOrganizationInvite(user)

    return { user, invite }
  }

  #getRateKey(email: string) {
    return `login_${this.ctx.request.ip()}_${email}`
  }

  async clearRateLimits(email: string) {
    return this.#limit.delete(this.#getRateKey(email))
  }

  async #checkForOrganizationInvite(user: User) {
    const inviteId = this.ctx.session.get('invite_id')

    if (!inviteId) return

    const result = await this.organizationInviteService.acceptInvite({
      inviteId,
      user,
    })

    this.ctx.session.forget('invite_id')
    this.ctx.session.flash(result.state, result.message)

    return result.invite
  }
}
