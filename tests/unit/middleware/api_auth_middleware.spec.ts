import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import ApiAuthMiddleware from '#middleware/api_auth_middleware'
import OAuthTokenValidationService from '#services/oauth_token_validation_service'
import OwnerRepository from '#repositories/owner_repository'

import UserFactory from '#database/factories/user_factory'
import User from '#models/user'

test.group('ApiAuthMiddleware | Unit', (group) => {
  let middleware: ApiAuthMiddleware
  let tokenValidationServiceStub: sinon.SinonStubbedInstance<OAuthTokenValidationService>
  let ownerRepositoryStub: sinon.SinonStubbedInstance<OwnerRepository>
  let fakeUser: User
  let nextSpy: sinon.SinonSpy

  async function createTestContext(authHeader?: string) {
    const ctx = {} as any

    // Mock request
    ctx.request = {
      header: sinon.stub().withArgs('authorization').returns(authHeader),
    }

    // Mock response
    ctx.response = {
      unauthorized: sinon.spy((data) => data),
    }

    // Mock auth
    const loginStub = sinon.stub().resolves()
    ctx.auth = {
      use: sinon.stub().returns({ login: loginStub }),
    } as any

    return { ctx, loginStub }
  }

  group.each.setup(async () => {
    tokenValidationServiceStub = sinon.createStubInstance(OAuthTokenValidationService)
    ownerRepositoryStub = sinon.createStubInstance(OwnerRepository)
    app.container.swap(OAuthTokenValidationService, () => tokenValidationServiceStub as any)
    app.container.swap(OwnerRepository, () => ownerRepositoryStub as any)
    middleware = await app.container.make(ApiAuthMiddleware)
    fakeUser = await UserFactory.make()
    nextSpy = sinon.spy()
  })

  group.each.teardown(() => {
    sinon.restore()
    app.container.restore(OAuthTokenValidationService)
    app.container.restore(OwnerRepository)
  })

  test('handle :: should authenticate user with valid Bearer token', async ({ assert }) => {
    const token = 'valid-access-token'
    const tokenData = {
      user: fakeUser,
      scopes: ['database:read', 'database:write'],
      organization: undefined,
    }

    tokenValidationServiceStub.validateAccessToken.resolves(tokenData)
    ownerRepositoryStub.findForTokenContext.resolves({ id: 'owner-123' } as any)

    const { ctx, loginStub } = await createTestContext(`Bearer ${token}`)

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(tokenValidationServiceStub.validateAccessToken.calledOnceWith(token))
    assert.isTrue(ownerRepositoryStub.findForTokenContext.calledOnceWith(tokenData))
    assert.isFalse(loginStub.called)
    assert.isTrue(nextSpy.calledOnce)

    // Verify token context is set correctly
    const expectedOwner = {
      scopes: ['database:read', 'database:write'],
      id: 'owner-123', // Should be the user's owner ID
      username: undefined, // From the stub
      userId: fakeUser.id,
    }
    assert.deepEqual(ctx.owner, expectedOwner)
  })

  test('handle :: should authenticate user with organization context', async ({ assert }) => {
    const token = 'valid-access-token'
    const organization = { id: 'org-123', name: 'Test Org' }
    const tokenData = {
      user: fakeUser,
      scopes: ['database:read'],
      organization: organization as any,
    }

    tokenValidationServiceStub.validateAccessToken.resolves(tokenData)
    ownerRepositoryStub.findForTokenContext.resolves({ id: 'owner-456' } as any)

    const { ctx, loginStub } = await createTestContext(`Bearer ${token}`)

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(tokenValidationServiceStub.validateAccessToken.calledOnceWith(token))
    assert.isTrue(ownerRepositoryStub.findForTokenContext.calledOnceWith(tokenData))
    assert.isFalse(loginStub.called)
    assert.isTrue(nextSpy.calledOnce)

    // Verify token context is set correctly with organization
    const expectedOwner = {
      scopes: ['database:read'],
      id: 'owner-456', // Should be the organization's owner ID
      username: undefined, // From the stub
      userId: fakeUser.id,
    }
    assert.deepEqual(ctx.owner, expectedOwner)
  })

  test('handle :: should return unauthorized when no Bearer token', async ({ assert }) => {
    const { ctx, loginStub } = await createTestContext()

    const result = await middleware.handle(ctx, nextSpy)

    assert.isFalse(tokenValidationServiceStub.validateAccessToken.called)
    assert.isFalse(loginStub.called)
    assert.isFalse(nextSpy.called)
    assert.isUndefined(ctx.owner)
    assert.deepEqual(result, { message: 'Bearer token required' })
    assert.isTrue(
      (ctx.response.unauthorized as sinon.SinonSpy).calledOnceWith({
        message: 'Bearer token required',
      })
    )
  })

  test('handle :: should return unauthorized when Authorization header is not Bearer', async ({
    assert,
  }) => {
    const { ctx, loginStub } = await createTestContext('Basic dXNlcjpwYXNz')

    const result = await middleware.handle(ctx, nextSpy)

    assert.isFalse(tokenValidationServiceStub.validateAccessToken.called)
    assert.isFalse(loginStub.called)
    assert.isFalse(nextSpy.called)
    assert.isUndefined(ctx.owner)
    assert.deepEqual(result, { message: 'Bearer token required' })
    assert.isTrue(
      (ctx.response.unauthorized as sinon.SinonSpy).calledOnceWith({
        message: 'Bearer token required',
      })
    )
  })

  test('handle :: should return unauthorized when token validation fails', async ({ assert }) => {
    const token = 'invalid-token'
    tokenValidationServiceStub.validateAccessToken.resolves(null)

    const { ctx, loginStub } = await createTestContext(`Bearer ${token}`)

    const result = await middleware.handle(ctx, nextSpy)

    assert.isTrue(tokenValidationServiceStub.validateAccessToken.calledOnceWith(token))
    assert.isFalse(loginStub.called)
    assert.isFalse(nextSpy.called)
    assert.isUndefined(ctx.owner)
    assert.deepEqual(result, { message: 'Invalid or expired token' })
    assert.isTrue(
      (ctx.response.unauthorized as sinon.SinonSpy).calledOnceWith({
        message: 'Invalid or expired token',
      })
    )
  })

  test('handle :: should return unauthorized when token data has no user', async ({ assert }) => {
    const token = 'valid-token-no-user'
    const tokenData = {
      user: null as any,
      scopes: ['database:read'],
      organization: undefined,
    }

    tokenValidationServiceStub.validateAccessToken.resolves(tokenData)

    const { ctx, loginStub } = await createTestContext(`Bearer ${token}`)

    const result = await middleware.handle(ctx, nextSpy)

    assert.isTrue(tokenValidationServiceStub.validateAccessToken.calledOnceWith(token))
    assert.isFalse(loginStub.called)
    assert.isFalse(nextSpy.called)
    assert.isUndefined(ctx.owner)
    assert.deepEqual(result, { message: 'Invalid or expired token' })
    assert.isTrue(
      (ctx.response.unauthorized as sinon.SinonSpy).calledOnceWith({
        message: 'Invalid or expired token',
      })
    )
  })

  test('handle :: should handle token validation service errors gracefully', async ({ assert }) => {
    const token = 'problematic-token'
    const serviceError = new Error('Token validation failed')
    tokenValidationServiceStub.validateAccessToken.rejects(serviceError)

    const { ctx, loginStub } = await createTestContext(`Bearer ${token}`)

    try {
      await middleware.handle(ctx, nextSpy)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Token validation failed')
      assert.isTrue(tokenValidationServiceStub.validateAccessToken.calledOnceWith(token))
      assert.isFalse(loginStub.called)
      assert.isFalse(nextSpy.called)
    }
  })

  test('handle :: should return unauthorized when empty token after Bearer prefix', async ({
    assert,
  }) => {
    const { ctx, loginStub } = await createTestContext('Bearer ')

    const result = await middleware.handle(ctx, nextSpy)

    assert.isTrue(tokenValidationServiceStub.validateAccessToken.calledOnceWith(''))
    assert.isFalse(loginStub.called)
    assert.isFalse(nextSpy.called)
    assert.isUndefined(ctx.owner)
    assert.deepEqual(result, { message: 'Invalid or expired token' })
    assert.isTrue(
      (ctx.response.unauthorized as sinon.SinonSpy).calledOnceWith({
        message: 'Invalid or expired token',
      })
    )
  })

  test('handle :: should return unauthorized when owner not found for token context', async ({
    assert,
  }) => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token'
    const tokenData = {
      user: fakeUser,
      scopes: ['database:write'],
      organization: undefined,
    }

    tokenValidationServiceStub.validateAccessToken.resolves(tokenData)
    ownerRepositoryStub.findForTokenContext.resolves(null)

    const { ctx, loginStub } = await createTestContext(`Bearer ${token}`)

    const result = await middleware.handle(ctx, nextSpy)

    assert.isTrue(tokenValidationServiceStub.validateAccessToken.calledOnceWith(token))
    assert.isTrue(ownerRepositoryStub.findForTokenContext.calledOnceWith(tokenData))
    assert.isFalse(loginStub.called)
    assert.isFalse(nextSpy.called)
    assert.deepEqual(result, { message: 'Invalid token context' })
    assert.isTrue(
      (ctx.response.unauthorized as sinon.SinonSpy).calledOnceWith({
        message: 'Invalid token context',
      })
    )
  })
})
