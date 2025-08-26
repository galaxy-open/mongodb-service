import TrustedIdentityProvider from '#models/trusted_identity_provider'
import env from '#start/env'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    await TrustedIdentityProvider.create({
      name: env.get('TIP_NAME'),
      slug: env.get('TIP_NAME'),
      issuerUrl: env.get('TIP_ISSUER_URL'),
      expectedAudience: env.get('TIP_EXPECTED_AUDIENCE'),
      jwksUri: env.get('TIP_JWKS_URI'),
    })
  }
}
