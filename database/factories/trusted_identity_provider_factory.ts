import factory from '@adonisjs/lucid/factories'
import TrustedIdentityProvider from '#models/trusted_identity_provider'

export const TrustedIdentityProviderFactory = factory
  .define(TrustedIdentityProvider, ({ faker }) => {
    const issuerUrl = faker.internet.url({ appendSlash: false })
    return {
      name: faker.company.name(),
      slug: faker.lorem.slug(),
      jwksUri: `${issuerUrl}/.well-known/jwks.json`,
      issuerUrl: issuerUrl,
      expectedAudience: `api://${faker.lorem.word()}`,
      isActive: true,
    }
  })
  .build()
