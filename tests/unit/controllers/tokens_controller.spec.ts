import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import sinon from 'sinon'
import OAuthTokenService from '#services/oauth_token_service'
import { tokenValidator, OAuthTokenParams } from '#validators/oauth_token'
import OAuthTokenController from '#controllers/oauth/tokens_controller'
import InvalidOAuthRequestException from '#exceptions/invalid_oauth_request_exception'

test.group('OAuthTokenController', (group) => {
  let serviceStub: sinon.SinonStubbedInstance<OAuthTokenService>
  let controller: OAuthTokenController
  let validateUsingSpy: sinon.SinonSpy

  const validAuthCodeParams: OAuthTokenParams = {
    grant_type: 'authorization_code',
    client_id: 'test-client-id',
    client_secret: 'test-client-secret',
    code: 'valid-auth-code',
    redirect_uri: 'https://client.app/callback',
  }

  const validRefreshTokenParams: OAuthTokenParams = {
    grant_type: 'refresh_token',
    client_id: 'test-client-id',
    client_secret: 'test-client-secret',
    refresh_token: 'valid-refresh-token',
  }

  const tokenResponse = {
    access_token: 'generated-access-token',
    token_type: 'Bearer' as const,
    expires_in: 3600,
    refresh_token: 'generated-refresh-token',
    scope: 'database:read database:write',
  }

  async function createTestContext(params: OAuthTokenParams) {
    const ctx = await testUtils.createHttpContext()

    // Mock the validateUsing method on the request object
    validateUsingSpy = sinon.spy(() => Promise.resolve(params))
    Object.defineProperty(ctx.request, 'validateUsing', {
      value: validateUsingSpy,
      writable: true,
      configurable: true,
    })

    // Mock response.json
    const jsonSpy = sinon.spy()
    Object.defineProperty(ctx.response, 'json', {
      value: jsonSpy,
      writable: true,
      configurable: true,
    })

    return ctx
  }

  group.each.setup(async () => {
    serviceStub = sinon.createStubInstance(OAuthTokenService)
    app.container.swap(OAuthTokenService, () => serviceStub as any)
    controller = await app.container.make(OAuthTokenController)
  })

  group.each.teardown(() => {
    sinon.restore()
    app.container.restore(OAuthTokenService)
  })

  test('store :: should successfully exchange authorization code for tokens', async ({
    assert,
  }) => {
    serviceStub.exchangeToken.resolves(tokenResponse)

    const ctx = await createTestContext(validAuthCodeParams)

    await controller.store(ctx)

    // Verify validation was called
    assert.isTrue(validateUsingSpy.calledOnceWith(tokenValidator))

    // Verify service was called with correct params
    assert.isTrue(serviceStub.exchangeToken.calledOnceWith(validAuthCodeParams))

    // Verify response was sent
    const jsonSpy = ctx.response.json as sinon.SinonSpy
    assert.isTrue(jsonSpy.calledOnceWith(tokenResponse))
  })

  test('store :: should successfully exchange refresh token for new access token', async ({
    assert,
  }) => {
    const refreshTokenResponse = {
      access_token: 'new-access-token',
      token_type: 'Bearer' as const,
      expires_in: 3600,
      scope: 'database:read database:write',
    }

    serviceStub.exchangeToken.resolves(refreshTokenResponse)

    const ctx = await createTestContext(validRefreshTokenParams)

    await controller.store(ctx)

    // Verify validation was called
    assert.isTrue(validateUsingSpy.calledOnceWith(tokenValidator))

    // Verify service was called with correct params
    assert.isTrue(serviceStub.exchangeToken.calledOnceWith(validRefreshTokenParams))

    // Verify response was sent
    const jsonSpy = ctx.response.json as sinon.SinonSpy
    assert.isTrue(jsonSpy.calledOnceWith(refreshTokenResponse))
  })

  test('store :: should let InvalidOAuthRequestException bubble up to global handler', async ({
    assert,
  }) => {
    const error = new InvalidOAuthRequestException('invalid_grant', 'Invalid authorization code')
    serviceStub.exchangeToken.rejects(error)

    const ctx = await createTestContext(validAuthCodeParams)

    try {
      await controller.store(ctx)
      assert.fail('Expected InvalidOAuthRequestException to be thrown')
    } catch (thrownError) {
      assert.instanceOf(thrownError, InvalidOAuthRequestException)
      assert.equal(thrownError.error, 'invalid_grant')
      assert.equal(thrownError.errorDescription, 'Invalid authorization code')
    }

    // Verify service was still called
    assert.isTrue(serviceStub.exchangeToken.calledOnceWith(validAuthCodeParams))

    // Verify response.json was NOT called
    const jsonSpy = ctx.response.json as sinon.SinonSpy
    assert.isFalse(jsonSpy.called)
  })

  test('store :: should let validation errors bubble up to global handler', async ({ assert }) => {
    const ctx = await createTestContext(validAuthCodeParams)

    // Mock validation to throw error
    const validationError = new Error('Validation failed: grant_type is required')
    validateUsingSpy = sinon.spy(() => Promise.reject(validationError))
    Object.defineProperty(ctx.request, 'validateUsing', {
      value: validateUsingSpy,
      writable: true,
      configurable: true,
    })

    try {
      await controller.store(ctx)
      assert.fail('Expected validation error to be thrown')
    } catch (thrownError) {
      assert.equal(thrownError.message, 'Validation failed: grant_type is required')
    }

    // Verify service was NOT called due to validation failure
    assert.isFalse(serviceStub.exchangeToken.called)

    // Verify response.json was NOT called
    const jsonSpy = ctx.response.json as sinon.SinonSpy
    assert.isFalse(jsonSpy.called)
  })

  test('store :: should let unexpected service errors bubble up to global handler', async ({
    assert,
  }) => {
    const unexpectedError = new Error('Database connection failed')
    serviceStub.exchangeToken.rejects(unexpectedError)

    const ctx = await createTestContext(validAuthCodeParams)

    try {
      await controller.store(ctx)
      assert.fail('Expected error to be thrown')
    } catch (thrownError) {
      assert.equal(thrownError.message, 'Database connection failed')
    }

    // Verify service was called
    assert.isTrue(serviceStub.exchangeToken.calledOnceWith(validAuthCodeParams))

    // Verify response.json was NOT called
    const jsonSpy = ctx.response.json as sinon.SinonSpy
    assert.isFalse(jsonSpy.called)
  })

  test('store :: should handle different grant types correctly', async ({ assert }) => {
    // Test authorization_code grant
    serviceStub.exchangeToken.onFirstCall().resolves(tokenResponse)

    const authCodeCtx = await createTestContext(validAuthCodeParams)
    await controller.store(authCodeCtx)

    assert.isTrue(serviceStub.exchangeToken.firstCall.calledWith(validAuthCodeParams))

    // Reset and test refresh_token grant
    serviceStub.exchangeToken.resetHistory()
    const refreshTokenResponse = {
      access_token: 'new-access-token',
      token_type: 'Bearer' as const,
      expires_in: 3600,
    }
    serviceStub.exchangeToken.onSecondCall().resolves(refreshTokenResponse)

    const refreshTokenCtx = await createTestContext(validRefreshTokenParams)
    await controller.store(refreshTokenCtx)

    assert.isTrue(serviceStub.exchangeToken.firstCall.calledWith(validRefreshTokenParams))
  })

  test('store :: should handle edge case with minimal token response', async ({ assert }) => {
    const minimalResponse = {
      access_token: 'access-token-only',
      token_type: 'Bearer' as const,
      expires_in: 3600,
    }

    serviceStub.exchangeToken.resolves(minimalResponse)

    const ctx = await createTestContext(validRefreshTokenParams)

    await controller.store(ctx)

    // Verify validation was called
    assert.isTrue(validateUsingSpy.calledOnceWith(tokenValidator))

    // Verify service was called
    assert.isTrue(serviceStub.exchangeToken.calledOnceWith(validRefreshTokenParams))

    // Verify minimal response was sent
    const jsonSpy = ctx.response.json as sinon.SinonSpy
    assert.isTrue(jsonSpy.calledOnceWith(minimalResponse))
  })

  test('store :: should handle complex params with optional fields', async ({ assert }) => {
    const complexParams: OAuthTokenParams = {
      grant_type: 'refresh_token',
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      refresh_token: 'valid-refresh-token',
      scope: 'database:read', // Optional scope for refresh token
    }

    const scopedResponse = {
      access_token: 'scoped-access-token',
      token_type: 'Bearer' as const,
      expires_in: 3600,
      scope: 'database:read',
    }

    serviceStub.exchangeToken.resolves(scopedResponse)

    const ctx = await createTestContext(complexParams)

    await controller.store(ctx)

    // Verify validation was called
    assert.isTrue(validateUsingSpy.calledOnceWith(tokenValidator))

    // Verify service received all parameters including optional scope
    assert.isTrue(serviceStub.exchangeToken.calledOnceWith(complexParams))

    // Verify scoped response was sent
    const jsonSpy = ctx.response.json as sinon.SinonSpy
    assert.isTrue(jsonSpy.calledOnceWith(scopedResponse))
  })
})
