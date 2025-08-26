import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OAuthJitMiddleware from '#middleware/oauth_jit_middleware'
import OAuthJwtService from '#services/oauth_jwt_service'
import UserProvisioningService from '#services/user_provisioning_service'
import OrganizationProvisioningService from '#services/organization_provisioning_service'
import UserFactory from '#database/factories/user_factory'
import User from '#models/user'

test.group('OAuthJitMiddleware | Unit', (group) => {
  let middleware: OAuthJitMiddleware
  let jwtServiceStub: sinon.SinonStubbedInstance<OAuthJwtService>
  let userProvisioningStub: sinon.SinonStubbedInstance<UserProvisioningService>
  let orgProvisioningStub: sinon.SinonStubbedInstance<OrganizationProvisioningService>
  let fakeUser: User
  let nextSpy: sinon.SinonSpy

  async function createTestContext(queryParams = {}, authenticatedUser?: User) {
    const ctx = {} as any

    // Mock request
    ctx.request = {
      qs: sinon.stub().returns(queryParams),
    }

    // Mock auth
    const checkStub = sinon.stub()
    const loginStub = sinon.stub().resolves()

    if (authenticatedUser) {
      checkStub.resolves()
      ctx.auth = {
        user: authenticatedUser,
        check: checkStub,
        use: sinon.stub().returns({ login: loginStub }),
      }
    } else {
      checkStub.rejects(new Error('Not authenticated'))
      ctx.auth = {
        user: null,
        check: checkStub,
        use: sinon.stub().returns({ login: loginStub }),
      }
    }

    // Mock session
    ctx.session = {
      put: sinon.spy(),
    }

    return { ctx, checkStub, loginStub }
  }

  group.each.setup(async () => {
    jwtServiceStub = sinon.createStubInstance(OAuthJwtService)
    userProvisioningStub = sinon.createStubInstance(UserProvisioningService)
    orgProvisioningStub = sinon.createStubInstance(OrganizationProvisioningService)

    app.container.swap(OAuthJwtService, () => jwtServiceStub as any)
    app.container.swap(UserProvisioningService, () => userProvisioningStub as any)
    app.container.swap(OrganizationProvisioningService, () => orgProvisioningStub as any)

    middleware = await app.container.make(OAuthJitMiddleware)
    fakeUser = await UserFactory.make()
    nextSpy = sinon.spy()
  })

  group.each.teardown(() => {
    sinon.restore()
    app.container.restore(OAuthJwtService)
    app.container.restore(UserProvisioningService)
    app.container.restore(OrganizationProvisioningService)
  })

  test('handle :: should skip JIT when user is already authenticated', async ({ assert }) => {
    const { ctx } = await createTestContext({}, fakeUser)

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(ctx.auth.check.calledOnce)
    assert.isFalse(jwtServiceStub.verifyAndExtractUser.called)
    assert.isFalse(userProvisioningStub.provisionUser.called)
    assert.isTrue(nextSpy.calledOnce)
  })

  test('handle :: should skip JIT when no id_token_hint is present', async ({ assert }) => {
    const { ctx } = await createTestContext()

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(ctx.auth.check.calledOnce)
    assert.isFalse(jwtServiceStub.verifyAndExtractUser.called)
    assert.isFalse(userProvisioningStub.provisionUser.called)
    assert.isTrue(nextSpy.calledOnce)
  })

  test('handle :: should perform JIT provisioning when id_token_hint is present', async ({
    assert,
  }) => {
    const idTokenHint = 'valid.jwt.token'
    const jwtData = {
      email: 'test@example.com',
      username: 'testuser',
      external_idp_id: 'idp-123',
      external_user_id: 'user-456',
      organization: undefined,
    }

    jwtServiceStub.verifyAndExtractUser.resolves(jwtData)
    userProvisioningStub.provisionUser.resolves(fakeUser)

    const { ctx, loginStub } = await createTestContext({ id_token_hint: idTokenHint })

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(jwtServiceStub.verifyAndExtractUser.calledOnceWith(idTokenHint))
    assert.isTrue(
      userProvisioningStub.provisionUser.calledOnceWith({
        email: 'test@example.com',
        username: 'testuser',
        externalIdpId: 'idp-123',
        externalUserId: 'user-456',
      })
    )
    assert.isTrue(loginStub.calledOnceWith(fakeUser))
    assert.isTrue(nextSpy.calledOnce)
  })

  test('handle :: should provision organization when organization data is valid', async ({
    assert,
  }) => {
    const idTokenHint = 'valid.jwt.token'
    const organizationData = {
      username: 'testorg',
      name: 'Test Organization',
    }
    const jwtData = {
      email: 'test@example.com',
      username: 'testuser',
      external_idp_id: 'idp-123',
      external_user_id: 'user-456',
      organization: organizationData,
    }
    const orgResult = {
      organization: { id: 'org-123', name: 'Test Organization' },
      userRole: 'developer',
    }

    jwtServiceStub.verifyAndExtractUser.resolves(jwtData)
    userProvisioningStub.provisionUser.resolves(fakeUser)
    orgProvisioningStub.isValidOrganizationData.returns(true)
    orgProvisioningStub.provisionOrganizationAndUser.resolves(orgResult as any)

    const { ctx, loginStub } = await createTestContext({ id_token_hint: idTokenHint })

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(orgProvisioningStub.isValidOrganizationData.calledOnceWith(organizationData))
    assert.isTrue(
      orgProvisioningStub.provisionOrganizationAndUser.calledOnceWith(fakeUser, organizationData)
    )
    assert.isTrue(loginStub.calledOnceWith(fakeUser))

    // Verify organization context is stored in session
    assert.isTrue(
      (ctx.session.put as sinon.SinonSpy).calledWith('oauth_organization_id', 'org-123')
    )
    assert.isTrue(
      (ctx.session.put as sinon.SinonSpy).calledWith('oauth_organization_role', 'developer')
    )
    assert.isTrue(nextSpy.calledOnce)
  })

  test('handle :: should skip organization provisioning when organization data is invalid', async ({
    assert,
  }) => {
    const idTokenHint = 'valid.jwt.token'
    const invalidOrgData = { username: '', name: 'Test Org' }
    const jwtData = {
      email: 'test@example.com',
      username: 'testuser',
      external_idp_id: 'idp-123',
      external_user_id: 'user-456',
      organization: invalidOrgData,
    }

    jwtServiceStub.verifyAndExtractUser.resolves(jwtData)
    userProvisioningStub.provisionUser.resolves(fakeUser)
    orgProvisioningStub.isValidOrganizationData.returns(false)

    const { ctx, loginStub } = await createTestContext({ id_token_hint: idTokenHint })

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(orgProvisioningStub.isValidOrganizationData.calledOnceWith(invalidOrgData))
    assert.isFalse(orgProvisioningStub.provisionOrganizationAndUser.called)
    assert.isTrue(loginStub.calledOnceWith(fakeUser))
    assert.isFalse((ctx.session.put as sinon.SinonSpy).called)
    assert.isTrue(nextSpy.calledOnce)
  })

  test('handle :: should continue to next middleware when JWT verification fails', async ({
    assert,
  }) => {
    const idTokenHint = 'invalid.jwt.token'
    const jwtError = new Error('JWT verification failed')

    jwtServiceStub.verifyAndExtractUser.rejects(jwtError)

    const { ctx } = await createTestContext({ id_token_hint: idTokenHint })

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(jwtServiceStub.verifyAndExtractUser.calledOnceWith(idTokenHint))
    assert.isFalse(userProvisioningStub.provisionUser.called)
    assert.isFalse(orgProvisioningStub.provisionOrganizationAndUser.called)
    assert.isTrue(nextSpy.calledOnce)
  })

  test('handle :: should continue to next middleware when user provisioning fails', async ({
    assert,
  }) => {
    const idTokenHint = 'valid.jwt.token'
    const jwtData = {
      email: 'test@example.com',
      username: 'testuser',
      external_idp_id: 'idp-123',
      external_user_id: 'user-456',
      organization: undefined,
    }
    const provisioningError = new Error('User provisioning failed')

    jwtServiceStub.verifyAndExtractUser.resolves(jwtData)
    userProvisioningStub.provisionUser.rejects(provisioningError)

    const { ctx } = await createTestContext({ id_token_hint: idTokenHint })

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(jwtServiceStub.verifyAndExtractUser.calledOnceWith(idTokenHint))
    assert.isTrue(userProvisioningStub.provisionUser.calledOnce)
    assert.isTrue(nextSpy.calledOnce)
  })

  test('handle :: should continue to next middleware when organization provisioning fails', async ({
    assert,
  }) => {
    const idTokenHint = 'valid.jwt.token'
    const organizationData = {
      username: 'testorg',
      name: 'Test Organization',
    }
    const jwtData = {
      email: 'test@example.com',
      username: 'testuser',
      external_idp_id: 'idp-123',
      external_user_id: 'user-456',
      organization: organizationData,
    }
    const orgError = new Error('Organization provisioning failed')

    jwtServiceStub.verifyAndExtractUser.resolves(jwtData)
    userProvisioningStub.provisionUser.resolves(fakeUser)
    orgProvisioningStub.isValidOrganizationData.returns(true)
    orgProvisioningStub.provisionOrganizationAndUser.rejects(orgError)

    const { ctx } = await createTestContext({ id_token_hint: idTokenHint })

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(jwtServiceStub.verifyAndExtractUser.calledOnceWith(idTokenHint))
    assert.isTrue(userProvisioningStub.provisionUser.calledOnce)
    assert.isTrue(orgProvisioningStub.provisionOrganizationAndUser.calledOnce)
    assert.isTrue(nextSpy.calledOnce)
  })

  test('handle :: should handle auth.check() rejection gracefully', async ({ assert }) => {
    const idTokenHint = 'valid.jwt.token'
    const jwtData = {
      email: 'test@example.com',
      username: 'testuser',
      external_idp_id: 'idp-123',
      external_user_id: 'user-456',
      organization: undefined,
    }

    jwtServiceStub.verifyAndExtractUser.resolves(jwtData)
    userProvisioningStub.provisionUser.resolves(fakeUser)

    const { ctx, checkStub, loginStub } = await createTestContext({ id_token_hint: idTokenHint })

    // Ensure auth.check() rejects
    checkStub.rejects(new Error('Not authenticated'))

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(checkStub.calledOnce)
    assert.isTrue(jwtServiceStub.verifyAndExtractUser.calledOnceWith(idTokenHint))
    assert.isTrue(userProvisioningStub.provisionUser.calledOnce)
    assert.isTrue(loginStub.calledOnceWith(fakeUser))
    assert.isTrue(nextSpy.calledOnce)
  })

  test('handle :: should handle missing organization data gracefully', async ({ assert }) => {
    const idTokenHint = 'valid.jwt.token'
    const jwtData = {
      email: 'test@example.com',
      username: 'testuser',
      external_idp_id: 'idp-123',
      external_user_id: 'user-456',
      organization: undefined,
    }

    jwtServiceStub.verifyAndExtractUser.resolves(jwtData)
    userProvisioningStub.provisionUser.resolves(fakeUser)
    orgProvisioningStub.isValidOrganizationData.returns(false)

    const { ctx, loginStub } = await createTestContext({ id_token_hint: idTokenHint })

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(jwtServiceStub.verifyAndExtractUser.calledOnceWith(idTokenHint))
    assert.isTrue(userProvisioningStub.provisionUser.calledOnce)
    assert.isTrue(orgProvisioningStub.isValidOrganizationData.calledOnceWith(undefined))
    assert.isFalse(orgProvisioningStub.provisionOrganizationAndUser.called)
    assert.isTrue(loginStub.calledOnceWith(fakeUser))
    assert.isTrue(nextSpy.calledOnce)
  })

  test('handle :: should handle empty id_token_hint gracefully', async ({ assert }) => {
    const { ctx } = await createTestContext({ id_token_hint: '' })

    await middleware.handle(ctx, nextSpy)

    assert.isTrue(ctx.auth.check.calledOnce)
    assert.isFalse(jwtServiceStub.verifyAndExtractUser.called)
    assert.isTrue(nextSpy.calledOnce)
  })
})
