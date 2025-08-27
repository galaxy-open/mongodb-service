import factory from '@adonisjs/lucid/factories'
import hash from '@adonisjs/core/services/hash'
import OAuthClient from '#models/oauth_client'

export const OAuthClientFactory = factory
  .define(OAuthClient, async ({ faker }) => {
    // For testing, use a predictable client secret
    // In production, this would be a random secret
    const clientSecret = 'client-secret'
    const clientSecretHash = await hash.make(clientSecret)

    return {
      // Use predictable UUID for testing consistency
      id: faker.string.uuid(),
      clientSecretHash: clientSecretHash,
      clientName: faker.company.name(),
      redirectUris: ['https://example.com/callback'],
      grantTypes: ['authorization_code', 'refresh_token'],
      isTrusted: false,
      isConfidential: true,
      accessTokenLifetime: 3600, // 1 hour
      refreshTokenLifetime: 86400, // 1 day
    }
  })
  .build()
