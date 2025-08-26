import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OAuthAuthorizationService from '#services/oauth_authorization_service'
import { authorizeValidator } from '#validators/oauth_authorize'
import OAuthAuthorizeController from '#controllers/oauth/authorize_controller'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'
import UserFactory from '#database/factories/user_factory'
import User from '#models/user'
import oauthScopesConfig from '#config/oauth_scopes'

test.group('OAuthAuthorizeController', (group) => {
  let serviceStub: sinon.SinonStubbedInstance<OAuthAuthorizationService>
  let controller: OAuthAuthorizeController
  let fakeUser: User
  let validateUsingSpy: sinon.SinonSpy

  const fakeParams = {
    client_id: 'test-client',
    response_type: 'code',
    redirect_uri: 'https://client.app/callback',
    scope: `${Object.keys(oauthScopesConfig.scopes)[0]} ${Object.keys(oauthScopesConfig.scopes)[1]}`, // database:read database:write
  }

  async function createTestContext(authenticatedUser?: User, consentGranted: boolean = false) {
    const ctx = {} as any

    // Mock request
    ctx.request = {
      validateUsing: validateUsingSpy,
    }

    // Mock response
    Object.defineProperty(ctx, 'response', {
      value: {},
      writable: true,
      configurable: true,
    })

    // Mock session
    const sessionGetStub = sinon.stub()
    sessionGetStub.withArgs('consent_granted', false).returns(consentGranted)
    sessionGetStub.withArgs('oauth_organization_id', null).returns(null)
    sessionGetStub.returns(undefined)

    ctx.session = {
      put: sinon.spy(),
      forget: sinon.spy(),
      get: sessionGetStub,
    } as any

    // Mock auth - user is guaranteed to be authenticated by middleware
    const loginStub = sinon.stub().resolves()
    ctx.auth = {
      user: authenticatedUser,
      use: sinon.stub().returns({ login: loginStub }),
    } as any

    return ctx
  }

  group.each.setup(async () => {
    serviceStub = sinon.createStubInstance(OAuthAuthorizationService)
    app.container.swap(OAuthAuthorizationService, () => serviceStub as any)
    controller = await app.container.make(OAuthAuthorizeController)
    fakeUser = await UserFactory.make()

    validateUsingSpy = sinon.stub().resolves(fakeParams)
  })

  group.each.teardown(() => {
    sinon.restore()
    app.container.restore(OAuthAuthorizationService)
  })

  test('show :: should store params in session and redirect to the returned URL', async ({
    assert,
  }) => {
    const redirectUrl = 'https://client.app/callback?code=123'
    serviceStub.authorize.resolves({ redirectUrl })

    const ctx = await createTestContext(fakeUser) // User guaranteed by middleware
    const redirectSpy = sinon.spy()
    Object.defineProperty(ctx.response, 'redirect', {
      value: redirectSpy,
      writable: true,
      configurable: true,
    })

    await controller.show(ctx)

    assert.isTrue(validateUsingSpy.calledOnceWith(authorizeValidator))
    assert.isTrue((ctx.session.put as sinon.SinonSpy).calledOnceWith('oauth_params', fakeParams))
    assert.isTrue(
      serviceStub.authorize.calledOnceWith({
        params: fakeParams,
        user: fakeUser,
        consentGranted: false,
        organizationId: null,
      })
    )
    assert.isTrue(redirectSpy.calledOnceWith(redirectUrl))
  })

  test('show :: should pass authenticated user to service', async ({ assert }) => {
    const redirectUrl = 'https://client.app/callback?code=123'
    serviceStub.authorize.resolves({ redirectUrl })

    const ctx = await createTestContext(fakeUser)
    const redirectSpy = sinon.spy()
    Object.defineProperty(ctx.response, 'redirect', {
      value: redirectSpy,
      writable: true,
      configurable: true,
    })

    await controller.show(ctx)

    assert.isTrue(
      serviceStub.authorize.calledOnceWith({
        params: fakeParams,
        user: fakeUser,
        consentGranted: false,
        organizationId: null,
      })
    )
    assert.isTrue(redirectSpy.calledOnceWith(redirectUrl))
  })

  test('show :: should clear session when shouldClearSession is true', async ({ assert }) => {
    const redirectUrl = 'https://client.app/callback?code=123'
    serviceStub.authorize.resolves({
      redirectUrl,
      shouldClearSession: true,
    })

    const ctx = await createTestContext(fakeUser)
    const redirectSpy = sinon.spy()
    Object.defineProperty(ctx.response, 'redirect', {
      value: redirectSpy,
      writable: true,
      configurable: true,
    })

    await controller.show(ctx)

    // Should clear session
    const sessionForgetSpy = ctx.session.forget as sinon.SinonSpy
    assert.isTrue(sessionForgetSpy.calledWith('consent_granted'))
    assert.isTrue(sessionForgetSpy.calledWith('oauth_params'))

    assert.isTrue(redirectSpy.calledOnceWith(redirectUrl))
  })

  test('show :: should handle consent granted in session', async ({ assert }) => {
    const redirectUrl = 'https://client.app/callback?code=123'
    serviceStub.authorize.resolves({
      redirectUrl,
      shouldClearSession: true,
    })

    const ctx = await createTestContext(fakeUser, true) // consent granted
    const redirectSpy = sinon.spy()
    Object.defineProperty(ctx.response, 'redirect', {
      value: redirectSpy,
      writable: true,
      configurable: true,
    })

    await controller.show(ctx)

    // Should pass consent_granted = true to service
    assert.isTrue(
      serviceStub.authorize.calledOnceWith({
        params: fakeParams,
        user: fakeUser,
        consentGranted: true,
        organizationId: null,
      })
    )

    // Should clear session
    const sessionForgetSpy = ctx.session.forget as sinon.SinonSpy
    assert.isTrue(sessionForgetSpy.calledWith('consent_granted'))
    assert.isTrue(sessionForgetSpy.calledWith('oauth_params'))

    // Should redirect
    assert.isTrue(redirectSpy.calledOnceWith(redirectUrl))
  })

  test('show :: should let InvalidOAuthRequestException bubble up to global handler', async ({
    assert,
  }) => {
    const error = new InvalidOAuthRequestException('invalid_request', 'Invalid request parameters')
    serviceStub.authorize.rejects(error)

    const ctx = await createTestContext(fakeUser)

    try {
      await controller.show(ctx)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (thrownError) {
      assert.instanceOf(thrownError, InvalidOAuthRequestException)
      assert.equal(thrownError.error, 'invalid_request')
      assert.equal(thrownError.errorDescription, 'Invalid request parameters')
    }
  })

  test('show :: should let unexpected errors bubble up to global handler', async ({ assert }) => {
    const unexpectedError = new Error('Database connection failed')
    serviceStub.authorize.rejects(unexpectedError)

    const ctx = await createTestContext(fakeUser)

    try {
      await controller.show(ctx)
      assert.fail('Expected error to be thrown')
    } catch (thrownError) {
      assert.equal(thrownError.message, 'Database connection failed')
    }
  })
})
