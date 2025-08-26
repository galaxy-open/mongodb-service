import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import sinon from 'sinon'
import OAuthJwtService from '#services/oauth_jwt_service'
import JwtWrapperService from '#services/jwt_wrapper_service'
import TrustedIdentityProviderRepository from '#repositories/trusted_identity_provider_repository'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import { TrustedIdentityProviderFactory } from '#factories/trusted_identity_provider_factory'
import TrustedIdentityProvider from '#models/trusted_identity_provider'

test.group('OAuthJwtService | Unit', (group) => {
  let service: OAuthJwtService
  let trustedProviderRepositoryStub: sinon.SinonStubbedInstance<TrustedIdentityProviderRepository>
  let jwtWrapperStub: sinon.SinonStubbedInstance<JwtWrapperService>

  const FAKE_TOKEN = 'a.b.c'

  group.each.setup(async () => {
    trustedProviderRepositoryStub = sinon.createStubInstance(TrustedIdentityProviderRepository)
    jwtWrapperStub = sinon.createStubInstance(JwtWrapperService)

    app.container.swap(
      TrustedIdentityProviderRepository,
      () => trustedProviderRepositoryStub as any
    )
    app.container.swap(JwtWrapperService, () => jwtWrapperStub)

    service = await app.container.make(OAuthJwtService)
  })

  group.each.teardown(() => {
    app.container.restore(TrustedIdentityProviderRepository)
    app.container.restore(JwtWrapperService)
    sinon.restore()
  })

  test('verifyAndExtractUser :: should return user data for a valid token', async ({ assert }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = {
      iss: provider.issuerUrl,
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      aud: provider.expectedAudience,
    }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    const result = await service.verifyAndExtractUser(FAKE_TOKEN)

    assert.deepEqual(result, {
      email: jwtPayload.email,
      username: jwtPayload.username,
      external_user_id: jwtPayload.sub,
      external_idp_id: provider.id,
      organization: undefined,
    })
    assert.isTrue(trustedProviderRepositoryStub.findByIssuer.calledWith(jwtPayload.iss))
  })

  test('verifyAndExtractUser :: should throw if JWT is missing issuer claim', async ({
    assert,
  }) => {
    jwtWrapperStub.decodeJwt.returns({ iss: undefined })

    try {
      await service.verifyAndExtractUser(FAKE_TOKEN)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
    }
  })

  test('verifyAndExtractUser :: should throw if issuer is not trusted', async ({ assert }) => {
    const issuer = 'https://untrusted.com'
    jwtWrapperStub.decodeJwt.returns({ iss: issuer })
    trustedProviderRepositoryStub.findByIssuer.resolves(null)

    try {
      await service.verifyAndExtractUser(FAKE_TOKEN)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.message, 'Untrusted or misconfigured JWT issuer')
    }
    assert.isTrue(trustedProviderRepositoryStub.findByIssuer.calledWith(issuer))
  })

  test('verifyAndExtractUser :: should throw if provider has no jwksUri', async ({ assert }) => {
    const provider = await TrustedIdentityProviderFactory.merge({
      jwksUri: undefined as any,
    }).make()
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider as TrustedIdentityProvider)

    try {
      await service.verifyAndExtractUser(FAKE_TOKEN)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.message, 'Untrusted or misconfigured JWT issuer')
    }
  })

  test('verifyAndExtractUser :: should throw on JWT verification failure', async ({ assert }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.rejects(new Error('Invalid signature'))

    try {
      await service.verifyAndExtractUser(FAKE_TOKEN)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.message, 'Invalid JWT signature or claims: Invalid signature')
    }
  })

  test('verifyAndExtractUser :: should throw if JWT is missing email claim', async ({ assert }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = { iss: provider.issuerUrl, sub: 'user-123' }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    try {
      await service.verifyAndExtractUser(FAKE_TOKEN)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.message, 'JWT missing required email or sub claim')
    }
  })

  test('verifyAndExtractUser :: should throw if JWT is missing sub claim', async ({ assert }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = { iss: provider.issuerUrl, email: 'test@example.com' }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    try {
      await service.verifyAndExtractUser(FAKE_TOKEN)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.message, 'JWT missing required email or sub claim')
    }
  })

  test('verifyAndExtractUser :: should throw on JWT decoding failure', async ({ assert }) => {
    jwtWrapperStub.decodeJwt.throws(new Error('Malformed JWT'))

    try {
      await service.verifyAndExtractUser(FAKE_TOKEN)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (error) {
      assert.instanceOf(error, InvalidOAuthRequestException)
      assert.equal(error.message, 'Invalid JWT format or structure')
    }
  })

  test('mapPayloadToUserData :: should use email prefix as username if username claim is missing', async ({
    assert,
  }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = {
      iss: provider.issuerUrl,
      sub: 'user-123',
      email: 'new.user@example.com',
    }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    const result = await service.verifyAndExtractUser(FAKE_TOKEN)

    assert.equal(result.username, 'new.user')
  })

  test('verifyAndExtractUser :: should extract organization data when present in JWT', async ({
    assert,
  }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = {
      iss: provider.issuerUrl,
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      organization: {
        username: 'Test-Organization',
      },
    }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    const result = await service.verifyAndExtractUser(FAKE_TOKEN)

    assert.deepEqual(result, {
      email: jwtPayload.email,
      username: jwtPayload.username,
      external_user_id: jwtPayload.sub,
      external_idp_id: provider.id,
      organization: {
        username: 'test-organization', // Should be normalized to lowercase
      },
    })
  })

  test('verifyAndExtractUser :: should extract organization data from "org" claim as fallback', async ({
    assert,
  }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = {
      iss: provider.issuerUrl,
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      org: {
        username: 'Fallback-Org',
      },
    }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    const result = await service.verifyAndExtractUser(FAKE_TOKEN)

    assert.deepEqual(result.organization, {
      username: 'fallback-org',
    })
  })

  test('verifyAndExtractUser :: should return undefined organization when organization claim is missing', async ({
    assert,
  }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = {
      iss: provider.issuerUrl,
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      // No organization claim
    }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    const result = await service.verifyAndExtractUser(FAKE_TOKEN)

    assert.isUndefined(result.organization)
  })

  test('verifyAndExtractUser :: should return undefined organization when organization claim is not an object', async ({
    assert,
  }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = {
      iss: provider.issuerUrl,
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      organization: 'not-an-object',
    }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    const result = await service.verifyAndExtractUser(FAKE_TOKEN)

    assert.isUndefined(result.organization)
  })

  test('verifyAndExtractUser :: should return undefined organization when username is missing', async ({
    assert,
  }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = {
      iss: provider.issuerUrl,
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      organization: {
        name: 'Organization Name', // username field is missing
      },
    }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    const result = await service.verifyAndExtractUser(FAKE_TOKEN)

    assert.isUndefined(result.organization)
  })

  test('verifyAndExtractUser :: should return undefined organization when username is empty', async ({
    assert,
  }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = {
      iss: provider.issuerUrl,
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      organization: {
        username: '', // Empty username
      },
    }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    const result = await service.verifyAndExtractUser(FAKE_TOKEN)

    assert.isUndefined(result.organization)
  })

  test('verifyAndExtractUser :: should return undefined organization when username is not a string', async ({
    assert,
  }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = {
      iss: provider.issuerUrl,
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      organization: {
        username: 123, // Not a string
      },
    }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    const result = await service.verifyAndExtractUser(FAKE_TOKEN)

    assert.isUndefined(result.organization)
  })

  test('verifyAndExtractUser :: should normalize organization username by trimming and lowercasing', async ({
    assert,
  }) => {
    const provider = await TrustedIdentityProviderFactory.make()
    const jwtPayload = {
      iss: provider.issuerUrl,
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      organization: {
        username: '  GALAXY-PORTAL  ', // Uppercase with whitespace
      },
    }
    jwtWrapperStub.decodeJwt.returns({ iss: provider.issuerUrl })
    trustedProviderRepositoryStub.findByIssuer.resolves(provider)
    jwtWrapperStub.jwtVerify.resolves({ payload: jwtPayload, protectedHeader: {} } as any)

    const result = await service.verifyAndExtractUser(FAKE_TOKEN)

    assert.equal(result.organization!.username, 'galaxy-portal')
  })
})
