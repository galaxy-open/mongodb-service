import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const OauthConsentController = () => import('#controllers/oauth/consent_controller')
const OauthTokenController = () => import('#controllers/oauth/tokens_controller')
const OauthAuthorizeController = () => import('#controllers/oauth/authorize_controller')

// User must be authenticated to access these routes (supports JIT provisioning)
router
  .group(() => {
    router
      .group(() => {
        router.get('/authorize', [OauthAuthorizeController, 'show']).as('oauth.authorize')
        router.get('/consent', [OauthConsentController, 'show']).as('oauth.consent')
        router.post('/consent', [OauthConsentController, 'store']).as('oauth.consent.store')
      })
      .use(middleware.oauth())

    router.post('/token', [OauthTokenController, 'store']).as('oauth.token.store')
  })
  .prefix('/oauth')
  .as('oauth')
