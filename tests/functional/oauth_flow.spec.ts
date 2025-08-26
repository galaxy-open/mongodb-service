import { test } from '@japa/runner'
import { OAuthClientFactory } from '#database/factories/oauth_client_factory'
import { TrustedIdentityProviderFactory } from '#database/factories/trusted_identity_provider_factory'
import UserFactory from '#database/factories/user_factory'
import OAuthClient from '#models/oauth_client'
import User from '#models/user'
import TrustedIdentityProvider from '#models/trusted_identity_provider'
import OauthConsent from '#models/oauth_consent'
import Organization from '#models/organization'
import Role from '#models/role'
import { DateTime } from 'luxon'
import { SignJWT, decodeJwt } from 'jose'
import string from '@adonisjs/core/helpers/string'
import app from '@adonisjs/core/services/app'
import OAuthJwtService from '#services/oauth_jwt_service'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import oauthScopesConfig from '#config/oauth_scopes'

test.group('OAuth Flow', (group) => {
  let testUser: User
  let testClient: OAuthClient

  group.each.setup(async () => {
    // Create test user and client for each test
    testUser = await UserFactory.create()
    testClient = await OAuthClientFactory.create()
  })

  test('should redirect to consent page for valid authorization request', async ({ client }) => {
    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        response_type: 'code',
        redirect_uri: testClient.redirectUris[0],
        scope: 'read write',
        state: 'test-state-123',
      })
      .loginAs(testUser)

    response.assertRedirectsTo('/oauth/consent')
  })

  test('should auto-approve and redirect for trusted clients', async ({ client }) => {
    const trustedClient = await OAuthClientFactory.merge({ isTrusted: true }).create()

    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: trustedClient.id,
        response_type: 'code',
        redirect_uri: trustedClient.redirectUris[0],
        state: 'test-state-123',
      })
      .loginAs(testUser)

    response.assertRedirectsTo('/callback')
  })

  test('should return error for invalid client_id', async ({ client }) => {
    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: '00000000-0000-0000-0000-000000000000', // Valid UUID format that doesn't exist
        response_type: 'code',
        redirect_uri: testClient.redirectUris[0],
      })
      .loginAs(testUser)

    response.assertStatus(400)
    response.assertBodyContains({
      error: 'invalid_client',
    })
  })

  test('should return error for invalid redirect_uri', async ({ client }) => {
    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        response_type: 'code',
        redirect_uri: 'https://malicious-site.com/callback',
      })
      .loginAs(testUser)

    response.assertStatus(400)
    response.assertBodyContains({
      error: 'invalid_request',
    })
  })

  test('should return error for unsupported response_type', async ({ client }) => {
    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        response_type: 'token', // Not supported
        redirect_uri: testClient.redirectUris[0],
      })
      .loginAs(testUser)

    response.assertStatus(422)
    response.assertBodyContains([
      {
        field: 'response_type',
        message: 'The selected response_type is invalid',
      },
    ])
  })

  test('should return error for missing client_id', async ({ client }) => {
    const response = await client
      .get('/oauth/authorize')
      .qs({
        response_type: 'code',
        redirect_uri: 'https://example.com/callback',
      })
      .loginAs(testUser)

    response.assertStatus(422)
    response.assertBodyContains([
      {
        field: 'client_id',
        message: 'The client_id field must be defined',
        rule: 'required',
      },
    ])
  })

  test('should return error for missing response_type', async ({ client }) => {
    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        redirect_uri: 'https://example.com/callback',
      })
      .loginAs(testUser)

    response.assertStatus(422)
    response.assertBodyContains([
      {
        field: 'response_type',
        message: 'The response_type field must be defined',
        rule: 'required',
      },
    ])
  })

  test('should return error for missing redirect_uri', async ({ client }) => {
    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        response_type: 'code',
      })
      .loginAs(testUser)

    response.assertStatus(422)
    response.assertBodyContains([
      {
        field: 'redirect_uri',
        message: 'The redirect_uri field must be defined',
        rule: 'required',
      },
    ])
  })

  test('should handle multiple redirect URIs for client', async ({ client }) => {
    // Create client with multiple redirect URIs
    const multiUriClient = await OAuthClientFactory.merge({
      redirectUris: ['https://example.com/callback', 'https://app.example.com/oauth/callback'],
    }).create()

    // Test first redirect URI
    const response1 = await client
      .get('/oauth/authorize')
      .qs({
        client_id: multiUriClient.id,
        response_type: 'code',
        redirect_uri: 'https://example.com/callback',
      })
      .loginAs(testUser)

    response1.assertRedirectsTo('/oauth/consent')

    // Test second redirect URI
    const response2 = await client
      .get('/oauth/authorize')
      .qs({
        client_id: multiUriClient.id,
        response_type: 'code',
        redirect_uri: 'https://app.example.com/oauth/callback',
      })
      .loginAs(testUser)

    response2.assertRedirectsTo('/oauth/consent')
  })

  test('should auto-approve if user has persistent consent', async ({ client }) => {
    // Create persistent consent for this user/client combination
    await OauthConsent.create({
      userId: testUser.id,
      clientId: testClient.id,
      scopes: [
        Object.keys(oauthScopesConfig.scopes)[0], // database:read
        Object.keys(oauthScopesConfig.scopes)[1], // database:write
      ],
      grantedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: 30 }), // Valid for 30 days
      isRevoked: false,
    })

    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        response_type: 'code',
        redirect_uri: testClient.redirectUris[0],
        scope: `${Object.keys(oauthScopesConfig.scopes)[0]} ${Object.keys(oauthScopesConfig.scopes)[1]}`,
        state: 'test-state-123',
      })
      .loginAs(testUser)

    // Should auto-approve and redirect to callback (not consent page)
    response.assertRedirectsTo('/callback')
  })

  test('should redirect to consent if user consent is expired', async ({ client }) => {
    // Create expired consent
    await OauthConsent.create({
      userId: testUser.id,
      clientId: testClient.id,
      scopes: [Object.keys(oauthScopesConfig.scopes)[0]], // database:read
      grantedAt: DateTime.now().minus({ days: 60 }),
      expiresAt: DateTime.now().minus({ days: 30 }), // Expired 30 days ago
      isRevoked: false,
    })

    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        response_type: 'code',
        redirect_uri: testClient.redirectUris[0],
        scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
        state: 'test-state-123',
      })
      .loginAs(testUser)

    // Should redirect to consent page because consent is expired
    response.assertRedirectsTo('/oauth/consent')
  })

  test('should redirect to consent if user consent is revoked', async ({ client }) => {
    // Create revoked consent
    await OauthConsent.create({
      userId: testUser.id,
      clientId: testClient.id,
      scopes: [Object.keys(oauthScopesConfig.scopes)[0]], // database:read
      grantedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: 30 }),
      isRevoked: true, // Revoked
    })

    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        response_type: 'code',
        redirect_uri: testClient.redirectUris[0],
        scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
        state: 'test-state-123',
      })
      .loginAs(testUser)

    // Should redirect to consent page because consent is revoked
    response.assertRedirectsTo('/oauth/consent')
  })

  test('should redirect to consent if requesting broader scope than consented', async ({
    client,
  }) => {
    // Create consent for limited scope
    await OauthConsent.create({
      userId: testUser.id,
      clientId: testClient.id,
      scopes: [Object.keys(oauthScopesConfig.scopes)[0]], // database:read
      grantedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: 30 }),
      isRevoked: false,
    })

    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        response_type: 'code',
        redirect_uri: testClient.redirectUris[0],
        scope: `${Object.keys(oauthScopesConfig.scopes)[0]} ${Object.keys(oauthScopesConfig.scopes)[1]}`, // Requesting broader scope
        state: 'test-state-123',
      })
      .loginAs(testUser)

    // Should redirect to consent page because requesting broader scope
    response.assertRedirectsTo('/oauth/consent')
  })

  test('should auto-approve if requesting subset of consented scope', async ({ client }) => {
    // Create consent for broad scope
    await OauthConsent.create({
      userId: testUser.id,
      clientId: testClient.id,
      scopes: [
        Object.keys(oauthScopesConfig.scopes)[0], // database:read
        Object.keys(oauthScopesConfig.scopes)[1], // database:write
        Object.keys(oauthScopesConfig.scopes)[2], // database:admin
      ],
      grantedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: 30 }),
      isRevoked: false,
    })

    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        response_type: 'code',
        redirect_uri: testClient.redirectUris[0],
        scope: Object.keys(oauthScopesConfig.scopes)[0], // Requesting subset
        state: 'test-state-123',
      })
      .loginAs(testUser)

    response.assertRedirectsTo('/callback')
  })
})

test.group('OAuth JIT Provisioning', (group) => {
  let testClient: OAuthClient
  let trustedProvider: TrustedIdentityProvider
  let jwtSecret: Uint8Array

  group.each.setup(async () => {
    testClient = await OAuthClientFactory.create()
    trustedProvider = await TrustedIdentityProviderFactory.create()
    jwtSecret = new TextEncoder().encode(string.generateRandom(32))

    // Mock the OAuthJwtService to accept our test JWTs
    app.container.swap(OAuthJwtService, () => {
      return {
        async verifyAndExtractUser(token: string) {
          try {
            // Decode the test JWT and return user data
            const payload = decodeJwt(token)

            // Validate basic structure
            if (!payload.email || !payload.sub || !payload.iss) {
              throw new InvalidOAuthRequestException(
                'invalid_request',
                'JWT missing required claims'
              )
            }

            // Check if issuer matches our trusted provider
            if (payload.iss !== trustedProvider.issuerUrl) {
              throw new InvalidOAuthRequestException('invalid_request', 'Untrusted issuer')
            }

            return {
              email: payload.email as string,
              username: (payload.username as string) || (payload.email as string).split('@')[0],
              external_user_id: payload.sub,
              external_idp_id: trustedProvider.id,
            }
          } catch (error) {
            // For malformed JWTs, throw the appropriate exception
            if (error instanceof InvalidOAuthRequestException) {
              throw error
            }
            throw new InvalidOAuthRequestException('invalid_request', 'Invalid JWT format')
          }
        },
      } as OAuthJwtService
    })
  })

  group.each.teardown(async () => {
    // Restore the original service
    app.container.restore(OAuthJwtService)
  })

  async function createValidJWT(userData: {
    email: string
    username?: string
    sub: string
    iss?: string
  }) {
    const payload = {
      iss: userData.iss || trustedProvider.issuerUrl,
      sub: userData.sub,
      email: userData.email,
      username: userData.username || userData.email.split('@')[0],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    }

    return await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(jwtSecret)
  }

  test('should provision new user with valid id_token_hint', async ({ client, assert }) => {
    const jwtData = {
      email: 'jit.user@example.com',
      username: 'jituser',
      sub: 'external-user-123',
    }

    const idTokenHint = await createValidJWT(jwtData)

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
    })

    // Should redirect to consent page (user was provisioned and authenticated)
    response.assertRedirectsTo('/oauth/consent')

    // Verify user was created
    const createdUser = await User.findBy('email', jwtData.email)
    assert.isNotNull(createdUser)
    assert.equal(createdUser!.email, jwtData.email)
    assert.equal(createdUser!.username, jwtData.username)
    assert.equal(createdUser!.externalUserId, jwtData.sub)
    assert.equal(createdUser!.externalIdpId, trustedProvider.id)
  })

  test('should link existing user with valid id_token_hint', async ({ client, assert }) => {
    // Create existing user without external linking
    const existingUser = await UserFactory.merge({
      email: 'existing.user@example.com',
      externalIdpId: null,
      externalUserId: null,
    }).create()

    const jwtData = {
      email: existingUser.email,
      username: 'existinguser',
      sub: 'external-user-456',
    }

    const idTokenHint = await createValidJWT(jwtData)

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
    })

    // Should redirect to consent page (user was linked and authenticated)
    response.assertRedirectsTo('/oauth/consent')

    // Verify user was linked to external provider
    await existingUser.refresh()
    assert.equal(existingUser.externalUserId, jwtData.sub)
    assert.equal(existingUser.externalIdpId, trustedProvider.id)
  })

  test('should authenticate already linked user with valid id_token_hint', async ({
    client,
    assert,
  }) => {
    // Create user already linked to external provider
    const linkedUser = await UserFactory.merge({
      email: 'linked.user@example.com',
      externalIdpId: trustedProvider.id,
      externalUserId: 'external-user-789',
    }).create()

    const jwtData = {
      email: linkedUser.email,
      sub: linkedUser.externalUserId!,
    }

    const idTokenHint = await createValidJWT(jwtData)

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
    })

    // Should redirect to consent page (user was authenticated)
    response.assertRedirectsTo('/oauth/consent')

    // User should remain unchanged
    await linkedUser.refresh()
    assert.equal(linkedUser.externalUserId, jwtData.sub)
    assert.equal(linkedUser.externalIdpId, trustedProvider.id)
  })

  test('should auto-approve for trusted client with JIT provisioning', async ({
    client,
    assert,
  }) => {
    const trustedClient = await OAuthClientFactory.merge({ isTrusted: true }).create()

    const jwtData = {
      email: 'jit.trusted@example.com',
      sub: 'external-user-trusted',
    }

    const idTokenHint = await createValidJWT(jwtData)

    const response = await client.get('/oauth/authorize').qs({
      client_id: trustedClient.id,
      response_type: 'code',
      redirect_uri: trustedClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
    })

    // Should auto-approve and redirect to callback (trusted client + JIT)
    response.assertRedirectsTo('/callback')

    // Verify user was created
    const createdUser = await User.findBy('email', jwtData.email)
    assert.isNotNull(createdUser)
    assert.equal(createdUser!.externalUserId, jwtData.sub)
  })

  test('should redirect to login for invalid id_token_hint', async ({ client }) => {
    const invalidToken = 'invalid.jwt.token'

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: invalidToken,
    })

    // Should redirect to login because JIT provisioning failed
    response.assertRedirectsTo('/login')
  })

  test('should redirect to login for untrusted issuer in id_token_hint', async ({ client }) => {
    const jwtData = {
      email: 'untrusted@example.com',
      sub: 'external-user-untrusted',
      iss: 'https://untrusted-issuer.com', // Untrusted issuer
    }

    const idTokenHint = await createValidJWT(jwtData)

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
    })

    // Should redirect to login because issuer is not trusted
    response.assertRedirectsTo('/login')
  })

  test('should handle JIT provisioning with existing session', async ({ client, assert }) => {
    // Create a regular user and log them in
    const sessionUser = await UserFactory.create()

    const jwtData = {
      email: 'jit.session@example.com',
      sub: 'external-user-session',
    }

    const idTokenHint = await createValidJWT(jwtData)

    const response = await client
      .get('/oauth/authorize')
      .qs({
        client_id: testClient.id,
        response_type: 'code',
        redirect_uri: testClient.redirectUris[0],
        scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
        id_token_hint: idTokenHint,
      })
      .loginAs(sessionUser) // User already logged in

    // Should redirect to consent page using existing session (JIT ignored)
    response.assertRedirectsTo('/oauth/consent')

    // JIT user should NOT be created because session user takes precedence
    const jitUser = await User.findBy('email', jwtData.email)
    assert.isNull(jitUser)
  })

  test('should handle malformed JWT gracefully', async ({ client }) => {
    const malformedToken = 'not.a.jwt'

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: malformedToken,
    })

    // Should redirect to login because JWT is malformed
    response.assertRedirectsTo('/login')
  })
})

test.group('OAuth JIT Organization Provisioning', (group) => {
  let testClient: OAuthClient
  let trustedProvider: TrustedIdentityProvider
  let jwtSecret: Uint8Array

  group.each.setup(async () => {
    testClient = await OAuthClientFactory.create()
    trustedProvider = await TrustedIdentityProviderFactory.create()
    jwtSecret = new TextEncoder().encode(string.generateRandom(32))

    // Mock the OAuthJwtService to accept our test JWTs with organization data
    app.container.swap(OAuthJwtService, () => {
      return {
        async verifyAndExtractUser(token: string) {
          try {
            // Decode the test JWT and return user data
            const payload = decodeJwt(token)

            // Validate basic structure
            if (!payload.email || !payload.sub || !payload.iss) {
              throw new InvalidOAuthRequestException(
                'invalid_request',
                'JWT missing required claims'
              )
            }

            // Check if issuer matches our trusted provider
            if (payload.iss !== trustedProvider.issuerUrl) {
              throw new InvalidOAuthRequestException('invalid_request', 'Untrusted issuer')
            }

            // Extract organization data if present
            let organizationData
            if (payload.organization && typeof payload.organization === 'object') {
              const orgData = payload.organization as Record<string, any>
              if (orgData.username && typeof orgData.username === 'string') {
                organizationData = {
                  username: orgData.username.toLowerCase().trim(),
                }
              }
            }

            return {
              email: payload.email as string,
              username: (payload.username as string) || (payload.email as string).split('@')[0],
              external_user_id: payload.sub,
              external_idp_id: trustedProvider.id,
              organization: organizationData,
            }
          } catch (error) {
            // For malformed JWTs, throw the appropriate exception
            if (error instanceof InvalidOAuthRequestException) {
              throw error
            }
            throw new InvalidOAuthRequestException('invalid_request', 'Invalid JWT format')
          }
        },
      } as OAuthJwtService
    })
  })

  group.each.teardown(async () => {
    // Restore the original service
    app.container.restore(OAuthJwtService)
  })

  async function createValidJWTWithOrganization(userData: {
    email: string
    username?: string
    sub: string
    iss?: string
    organization?: { username: string }
  }) {
    const payload = {
      iss: userData.iss || trustedProvider.issuerUrl,
      sub: userData.sub,
      email: userData.email,
      username: userData.username || userData.email.split('@')[0],
      organization: userData.organization,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    }

    return await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(jwtSecret)
  }

  test('should create new organization with first user as owner', async ({ client, assert }) => {
    const jwtData = {
      email: 'owner@galaxy-portal.com',
      username: 'owner',
      sub: 'external-owner-123',
      organization: {
        username: 'galaxy-portal',
      },
    }

    const idTokenHint = await createValidJWTWithOrganization(jwtData)

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
    })

    // Should redirect to consent page (user was provisioned and authenticated)
    response.assertRedirectsTo('/oauth/consent')

    // Verify user was created
    const createdUser = await User.findBy('email', jwtData.email)
    assert.isNotNull(createdUser)
    assert.equal(createdUser!.email, jwtData.email)
    assert.equal(createdUser!.externalUserId, jwtData.sub)

    // Verify organization was created
    const createdOrg = await Organization.findBy('username', 'galaxy-portal')
    assert.isNotNull(createdOrg)
    assert.equal(createdOrg!.username, 'galaxy-portal')
    assert.equal(createdOrg!.billingEmail, jwtData.email)
    assert.equal(createdOrg!.ownerUserId, createdUser!.id)

    // Verify user is assigned as owner using many-to-many relationship
    const orgWithUsers = await Organization.query()
      .where('id', createdOrg!.id)
      .preload('users', (query) => {
        query.where('users.id', createdUser!.id).pivotColumns(['role_name'])
      })
      .first()

    assert.isNotNull(orgWithUsers)
    assert.lengthOf(orgWithUsers!.users, 1)

    const role = await Role.find(orgWithUsers!.users[0].$extras.pivot_role_name)
    assert.equal(role!.name, 'owner')
  })

  test('should add subsequent user to existing organization as developer', async ({
    client,
    assert,
  }) => {
    // Create existing organization and owner user

    const ownerUser = await UserFactory.create()
    const ownerRole = await Role.findByOrFail('name', 'owner')

    const existingOrg = await Organization.create({
      username: 'existing-org',
      billingEmail: ownerUser.email,
      ownerUserId: ownerUser.id,
    })

    // Use many-to-many relationship to assign owner
    await existingOrg.related('users').attach({
      [ownerUser.id]: {
        role_name: ownerRole.name,
      },
    })

    // Now provision a new user for the same organization
    const jwtData = {
      email: 'developer@galaxy-portal.com',
      username: 'developer',
      sub: 'external-developer-456',
      organization: {
        username: 'existing-org',
      },
    }

    const idTokenHint = await createValidJWTWithOrganization(jwtData)

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
    })

    // Should redirect to consent page
    response.assertRedirectsTo('/oauth/consent')

    // Verify new user was created
    const newUser = await User.findBy('email', jwtData.email)
    assert.isNotNull(newUser)

    // Verify user was added to existing organization as developer using many-to-many relationship
    const orgWithUsers = await Organization.query()
      .where('id', existingOrg.id)
      .preload('users', (query) => {
        query.where('users.id', newUser!.id).pivotColumns(['role_name'])
      })
      .first()

    assert.isNotNull(orgWithUsers)
    assert.lengthOf(orgWithUsers!.users, 1)

    const role = await Role.find(orgWithUsers!.users[0].$extras.pivot_role_name)
    assert.equal(role!.name, 'developer')

    // Verify organization wasn't modified (still has original owner)
    await existingOrg.refresh()
    assert.equal(existingOrg.ownerUserId, ownerUser.id)
  })

  test('should handle existing user joining organization', async ({ client, assert }) => {
    // Create existing user without organization membership
    const existingUser = await UserFactory.merge({
      email: 'existing@galaxy-portal.com',
      externalIdpId: trustedProvider.id,
      externalUserId: 'existing-user-789',
    }).create()

    // Create existing organization

    const ownerUser = await UserFactory.create()
    const ownerRole = await Role.findByOrFail('name', 'owner')

    const existingOrg = await Organization.create({
      username: 'target-org',
      billingEmail: ownerUser.email,
      ownerUserId: ownerUser.id,
    })

    // Use many-to-many relationship to assign owner
    await existingOrg.related('users').attach({
      [ownerUser.id]: {
        role_name: ownerRole.name,
      },
    })

    // JWT for existing user joining the organization
    const jwtData = {
      email: existingUser.email,
      sub: existingUser.externalUserId!,
      organization: {
        username: 'target-org',
      },
    }

    const idTokenHint = await createValidJWTWithOrganization(jwtData)

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
    })

    // Should redirect to consent page
    response.assertRedirectsTo('/oauth/consent')

    // Verify user was added to organization as developer using many-to-many relationship
    const orgWithDeveloper = await Organization.query()
      .where('id', existingOrg.id)
      .preload('users', (query) => {
        query.where('users.id', existingUser.id).pivotColumns(['role_name'])
      })
      .first()

    assert.isNotNull(orgWithDeveloper)
    assert.lengthOf(orgWithDeveloper!.users, 1)

    const devRole = await Role.find(orgWithDeveloper!.users[0].$extras.pivot_role_name)
    assert.equal(devRole!.name, 'developer')
  })

  test('should handle user already member of organization', async ({ client, assert }) => {
    // Create organization and user that's already a member

    const existingUser = await UserFactory.merge({
      externalIdpId: trustedProvider.id,
      externalUserId: 'existing-member-999',
    }).create()

    const ownerUser = await UserFactory.create()
    const ownerRole = await Role.findByOrFail('name', 'owner')
    const developerRole = await Role.findByOrFail('name', 'developer')

    const existingOrg = await Organization.create({
      username: 'member-org',
      billingEmail: ownerUser.email,
      ownerUserId: ownerUser.id,
    })

    // Use many-to-many relationship to assign owner
    await existingOrg.related('users').attach({
      [ownerUser.id]: {
        role_name: ownerRole.name,
      },
    })

    // Make existing user already a member using many-to-many relationship
    await existingOrg.related('users').attach({
      [existingUser.id]: {
        role_name: developerRole.name,
      },
    })

    // JWT for user that's already a member
    const jwtData = {
      email: existingUser.email,
      sub: existingUser.externalUserId!,
      organization: {
        username: 'member-org',
      },
    }

    const idTokenHint = await createValidJWTWithOrganization(jwtData)

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
    })

    // Should redirect to consent page
    response.assertRedirectsTo('/oauth/consent')

    // Verify user still has original membership (no duplicates) using many-to-many relationship
    const orgWithMember = await Organization.query()
      .where('id', existingOrg.id)
      .preload('users', (query) => {
        query.where('users.id', existingUser.id).pivotColumns(['role_name'])
      })
      .first()

    assert.isNotNull(orgWithMember)
    assert.lengthOf(orgWithMember!.users, 1)
    assert.equal(orgWithMember!.users[0].$extras.pivot_role_name, developerRole.name)
  })

  test('should create organization and redirect to consent during JIT provisioning', async ({
    client,
    assert,
  }) => {
    const trustedClient = await OAuthClientFactory.create() // Use regular client first to test basic flow

    const jwtData = {
      email: 'token.test@galaxy-portal.com',
      username: 'tokentest',
      sub: 'external-token-123',
      organization: {
        username: 'token-org',
      },
    }

    const idTokenHint = await createValidJWTWithOrganization(jwtData)

    // Step 1: Get authorization code (should auto-approve for trusted client)
    const authResponse = await client.get('/oauth/authorize').qs({
      client_id: trustedClient.id,
      response_type: 'code',
      redirect_uri: trustedClient.redirectUris[0],
      scope: `${Object.keys(oauthScopesConfig.scopes)[0]} ${Object.keys(oauthScopesConfig.scopes)[1]}`, // database:read database:write
      id_token_hint: idTokenHint,
      state: 'test-state',
    })

    // Should redirect to consent page (user was provisioned and authenticated)
    authResponse.assertRedirectsTo('/oauth/consent')

    // Verify organization was created
    const createdOrg = await Organization.findBy('username', 'token-org')
    assert.isNotNull(createdOrg)
    assert.equal(createdOrg!.username, 'token-org')
  })

  test('should create organization during JIT provisioning with organization data', async ({
    client,
    assert,
  }) => {
    const trustedClient = await OAuthClientFactory.create() // Use regular client first to test basic flow

    const jwtData = {
      email: 'refresh.test@galaxy-portal.com',
      username: 'refreshtest',
      sub: 'external-refresh-456',
      organization: {
        username: 'refresh-org',
      },
    }

    const idTokenHint = await createValidJWTWithOrganization(jwtData)

    // Get initial tokens with organization context
    const authResponse = await client.get('/oauth/authorize').qs({
      client_id: trustedClient.id,
      response_type: 'code',
      redirect_uri: trustedClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
      state: 'refresh-test',
    })

    // Should redirect to consent page (user was provisioned and authenticated)
    authResponse.assertRedirectsTo('/oauth/consent')

    // Verify organization was created during JIT provisioning
    const organization = await Organization.findBy('username', 'refresh-org')
    assert.isNotNull(organization)
    assert.equal(organization!.username, 'refresh-org')
  })

  test('should handle JWT without organization data gracefully', async ({ client, assert }) => {
    // JWT without organization data (backward compatibility)
    const jwtData = {
      email: 'no.org@example.com',
      username: 'noorg',
      sub: 'external-no-org-789',
      // No organization field
    }

    const idTokenHint = await createValidJWTWithOrganization(jwtData)

    const response = await client.get('/oauth/authorize').qs({
      client_id: testClient.id,
      response_type: 'code',
      redirect_uri: testClient.redirectUris[0],
      scope: Object.keys(oauthScopesConfig.scopes)[0], // database:read
      id_token_hint: idTokenHint,
    })

    // Should still work and redirect to consent page
    response.assertRedirectsTo('/oauth/consent')

    // Verify user was created but no organization
    const createdUser = await User.findBy('email', jwtData.email)
    assert.isNotNull(createdUser)

    // Verify no organization was created by checking user has no organization memberships
    const userOrgs = await Organization.query()
      .preload('users', (query) => {
        query.where('users.id', createdUser!.id)
      })
      .whereHas('users', (query) => {
        query.where('users.id', createdUser!.id)
      })

    assert.lengthOf(userOrgs, 0)
  })
})
