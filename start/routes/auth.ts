import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
// const OrganizationsController = () => import('#controllers/organizations_controller')
const ForgotPasswordsController = () => import('#controllers/forgot_passwords_controller')
const LoginController = () => import('#controllers/login_controller')
const LogoutController = () => import('#controllers/logout_controller')
const RegisterController = () => import('#controllers/register_controller')

router.get('/register', [RegisterController, 'show']).as('register.show')
router.post('/register', [RegisterController, 'store']).as('register.store')

router.post('/logout', [LogoutController, 'handle']).as('logout').use(middleware.auth())

router.get('/login', [LoginController, 'show']).as('login.show')
router.post('/login', [LoginController, 'store']).as('login.store')

router
  .group(() => {
    router.get('/', [ForgotPasswordsController, 'index']).as('index')
    router.post('/', [ForgotPasswordsController, 'send']).as('send')
    router.get('/reset/:value', [ForgotPasswordsController, 'reset']).as('reset')
    router.post('/reset', [ForgotPasswordsController, 'update']).as('update')
  })
  .prefix('/forgot-password')
  .as('forgot_password')
