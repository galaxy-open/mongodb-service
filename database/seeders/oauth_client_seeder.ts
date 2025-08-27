import OAuthClient from '#models/oauth_client'
import env from '#start/env'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    await OAuthClient.create({
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 2592000,
      isTrusted: true,
      grantTypes: ['authorization_code', 'refresh_token'],
      redirectUris: [env.get('OAUTH_REDIRECT_URI', 'http://localhost:4000/api/oauth/callback')],
      clientName: env.get('TIP_NAME'),
      id: env.get('OAUTH_CLIENT_ID'),
      clientSecretHash: env.get('OAUTH_CLIENT_SECRET_HASH'),
    })
  }
}
