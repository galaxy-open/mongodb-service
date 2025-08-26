import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OAuthAuthMiddleware from '#middleware/oauth_auth_middleware'
import OAuthJitMiddleware from '#middleware/oauth_jit_middleware'
import AuthMiddleware from '#middleware/auth_middleware'

test.group('OAuthAuthMiddleware | Unit', (group) => {
  let middleware: OAuthAuthMiddleware
  let oauthJitStub: sinon.SinonStubbedInstance<OAuthJitMiddleware>
  let authStub: sinon.SinonStubbedInstance<AuthMiddleware>
  let nextSpy: sinon.SinonSpy

  async function createTestContext() {
    const ctx = {} as any
    return ctx
  }

  group.each.setup(async () => {
    oauthJitStub = sinon.createStubInstance(OAuthJitMiddleware)
    authStub = sinon.createStubInstance(AuthMiddleware)

    app.container.swap(OAuthJitMiddleware, () => oauthJitStub as any)
    app.container.swap(AuthMiddleware, () => authStub as any)

    middleware = await app.container.make(OAuthAuthMiddleware)
    nextSpy = sinon.spy()
  })

  group.each.teardown(() => {
    sinon.restore()
    app.container.restore(OAuthJitMiddleware)
    app.container.restore(AuthMiddleware)
  })

  test('handle :: should chain middlewares in correct order: oauthJit -> auth -> next', async ({
    assert,
  }) => {
    const ctx = await createTestContext()

    // Set up the middleware chain to call through properly
    oauthJitStub.handle.callsFake(async (_context: any, next: any) => {
      return next()
    })
    authStub.handle.callsFake(async (_context: any, next: any) => {
      return next()
    })

    await middleware.handle(ctx, nextSpy)

    // Verify all middlewares were called
    assert.isTrue(oauthJitStub.handle.calledOnce)
    assert.isTrue(authStub.handle.calledOnce)
    assert.isTrue(nextSpy.calledOnce)

    // Verify they were called with correct context
    assert.isTrue(oauthJitStub.handle.calledWith(ctx, sinon.match.func))
    assert.isTrue(authStub.handle.calledWith(ctx, sinon.match.func))
  })

  test('handle :: should stop chain if oauthJit middleware throws error', async ({ assert }) => {
    const ctx = await createTestContext()
    const jitError = new Error('JIT provisioning failed')

    oauthJitStub.handle.rejects(jitError)

    try {
      await middleware.handle(ctx, nextSpy)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'JIT provisioning failed')
      assert.isTrue(oauthJitStub.handle.calledOnce)
      assert.isFalse(authStub.handle.called)
      assert.isFalse(nextSpy.called)
    }
  })

  test('handle :: should stop chain if auth middleware throws error', async ({ assert }) => {
    const ctx = await createTestContext()
    const authError = new Error('Authentication failed')

    oauthJitStub.handle.callsFake(async (_context: any, next: any) => {
      return next()
    })
    authStub.handle.rejects(authError)

    try {
      await middleware.handle(ctx, nextSpy)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Authentication failed')
      assert.isTrue(oauthJitStub.handle.calledOnce)
      assert.isTrue(authStub.handle.calledOnce)
      assert.isFalse(nextSpy.called)
    }
  })

  test('handle :: should pass through if oauthJit middleware does not call next', async ({
    assert,
  }) => {
    const ctx = await createTestContext()

    // oauthJit middleware doesn't call next
    oauthJitStub.handle.callsFake(async () => {
      return 'jit_response'
    })

    const result = await middleware.handle(ctx, nextSpy)

    assert.equal(result, 'jit_response')
    assert.isTrue(oauthJitStub.handle.calledOnce)
    assert.isFalse(authStub.handle.called)
    assert.isFalse(nextSpy.called)
  })

  test('handle :: should pass through if auth middleware does not call next', async ({
    assert,
  }) => {
    const ctx = await createTestContext()

    oauthJitStub.handle.callsFake(async (_context: any, next: any) => {
      return next()
    })
    // auth middleware doesn't call next (e.g., redirects)
    authStub.handle.callsFake(async () => {
      return 'auth_redirect'
    })

    const result = await middleware.handle(ctx, nextSpy)

    assert.equal(result, 'auth_redirect')
    assert.isTrue(oauthJitStub.handle.calledOnce)
    assert.isTrue(authStub.handle.calledOnce)
    assert.isFalse(nextSpy.called)
  })

  test('handle :: should handle complex middleware chain with different return values', async ({
    assert,
  }) => {
    const ctx = await createTestContext()

    oauthJitStub.handle.callsFake(async (context: any, next: any) => {
      // Simulate JIT provisioning
      context.jitProvisioned = true
      return next()
    })
    authStub.handle.callsFake(async (context: any, next: any) => {
      // Simulate authentication
      context.authenticated = true
      return next()
    })

    await middleware.handle(ctx, nextSpy)

    // Verify context was passed through and modified by each middleware
    assert.isTrue((ctx as any).jitProvisioned)
    assert.isTrue((ctx as any).authenticated)
    assert.isTrue(nextSpy.calledOnce)
  })
})
