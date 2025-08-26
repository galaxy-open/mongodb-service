import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OAuthConsentService from '#services/oauth_consent_service'
import { consentValidator } from '#validators/oauth_consent'
import { OAuthParams } from '#validators/oauth_authorize'
import OAuthConsentController from '#controllers/oauth/consent_controller'
import UserFactory from '#database/factories/user_factory'
import User from '#models/user'

test.group('OAuthConsentController', (group) => {
  let serviceStub: sinon.SinonStubbedInstance<OAuthConsentService>
  let controller: OAuthConsentController
  let validateUsingSpy: sinon.SinonSpy
  let fakeUser: User

  const fakeOAuthParams: OAuthParams = {
    client_id: 'test-client-id',
    response_type: 'code',
    redirect_uri: 'https://client.app/callback',
    scope: 'openid profile',
    state: 'abc-123',
  }

  const fakeConsentData = {
    client: { name: 'Test Client', id: 'test-client-id' },
    scopes: [
      { scope: 'openid', description: 'Access your identity' },
      { scope: 'profile', description: 'Access your profile information' },
    ],
    user: { username: 'testuser', email: 'test@example.com' },
  }

  async function createTestContext(
    authenticatedUser?: User,
    oauthParams?: OAuthParams,
    validationResult: any = { decision: 'approve' }
  ) {
    const ctx = await testUtils.createHttpContext()

    // Mock validateUsing
    validateUsingSpy = sinon.spy(() => Promise.resolve(validationResult))
    Object.defineProperty(ctx.request, 'validateUsing', {
      value: validateUsingSpy,
      writable: true,
      configurable: true,
    })

    // Mock session
    const sessionGetStub = sinon.stub()
    sessionGetStub.withArgs('oauth_params').returns(oauthParams)
    sessionGetStub.returns(undefined)

    ctx.session = {
      put: sinon.spy(),
      forget: sinon.spy(),
      get: sessionGetStub,
    } as any

    // Mock auth - user is guaranteed to be authenticated by middleware
    ctx.auth = {
      user: authenticatedUser,
    } as any

    // Mock inertia
    ctx.inertia = {
      render: sinon.spy(),
    } as any

    // Mock response with proper redirect
    ctx.response = {
      redirect: sinon.stub(),
    } as any

    return ctx
  }

  group.each.setup(async () => {
    serviceStub = sinon.createStubInstance(OAuthConsentService)
    app.container.swap(OAuthConsentService, () => serviceStub as any)
    controller = await app.container.make(OAuthConsentController)
    fakeUser = await UserFactory.make()
  })

  group.each.teardown(() => {
    sinon.restore()
    app.container.restore(OAuthConsentService)
  })

  // Tests for show() method
  test('show :: should render consent page with consent data', async ({ assert }) => {
    serviceStub.getConsentData.resolves(fakeConsentData)

    const ctx = await createTestContext(fakeUser, fakeOAuthParams)

    await controller.show(ctx)

    assert.isTrue(serviceStub.getConsentData.calledOnceWith(fakeOAuthParams, fakeUser))
    assert.isTrue(
      (ctx.inertia.render as sinon.SinonSpy).calledOnceWith('oauth/consent', fakeConsentData)
    )
  })

  test('show :: should render error when no oauth params in session', async ({ assert }) => {
    const ctx = await createTestContext(fakeUser, undefined)

    await controller.show(ctx)

    assert.isFalse(serviceStub.getConsentData.called)
    assert.isTrue(
      (ctx.inertia.render as sinon.SinonSpy).calledOnceWith('errors/oauth_error', {
        error: 'Invalid OAuth request',
        errorDescription: 'No OAuth parameters found in session',
      })
    )
  })

  // Tests for store() method
  test('store :: should process approval and redirect', async ({ assert }) => {
    const decisionResult = {
      redirectUrl: 'https://client.app/callback?code=123',
      shouldGrantConsent: true,
    }
    serviceStub.processConsentDecision.resolves(decisionResult)

    const ctx = await createTestContext(fakeUser, fakeOAuthParams, { decision: 'approve' })

    await controller.store(ctx)

    assert.isTrue(validateUsingSpy.calledOnceWith(consentValidator))
    assert.isTrue(
      serviceStub.processConsentDecision.calledOnceWith('approve', fakeOAuthParams, fakeUser.id)
    )
    assert.isTrue((ctx.session.put as sinon.SinonSpy).calledOnceWith('consent_granted', true))
    assert.isTrue(
      (ctx.response.redirect as sinon.SinonStub).calledOnceWith(decisionResult.redirectUrl)
    )
  })

  test('store :: should process denial and clear session', async ({ assert }) => {
    const decisionResult = {
      redirectUrl: 'https://client.app/callback?error=access_denied',
      shouldClearSession: true,
    }
    serviceStub.processConsentDecision.resolves(decisionResult)

    const ctx = await createTestContext(fakeUser, fakeOAuthParams, { decision: 'deny' })

    await controller.store(ctx)

    assert.isTrue(validateUsingSpy.calledOnceWith(consentValidator))
    assert.isTrue(
      serviceStub.processConsentDecision.calledOnceWith('deny', fakeOAuthParams, fakeUser.id)
    )
    assert.isTrue((ctx.session.forget as sinon.SinonSpy).calledWith('oauth_params'))
    assert.isTrue((ctx.session.forget as sinon.SinonSpy).calledWith('consent_granted'))
    assert.isTrue(
      (ctx.response.redirect as sinon.SinonStub).calledOnceWith(decisionResult.redirectUrl)
    )
  })

  test('store :: should handle error when no oauth params', async ({ assert }) => {
    const ctx = await createTestContext(fakeUser, undefined, { decision: 'approve' })

    // Mock the redirect back functionality
    const redirectBackStub = sinon.stub().returnsArg(0)
    const withQsStub = sinon.stub().returns({ toPath: redirectBackStub })
    const redirectStub = sinon.stub().returns({ withQs: withQsStub })
    ctx.response.redirect = redirectStub

    await controller.store(ctx)

    assert.isTrue(validateUsingSpy.calledOnceWith(consentValidator))
    assert.isFalse(serviceStub.processConsentDecision.called)
    // Verify redirect back was called
    assert.isTrue(redirectStub.called)
  })
})
