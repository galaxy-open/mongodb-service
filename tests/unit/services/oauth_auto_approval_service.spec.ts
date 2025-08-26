import { test } from '@japa/runner'
import sinon from 'sinon'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import OAuthAutoApprovalService from '#services/oauth_auto_approval_service'
import CodeGeneratorService from '#services/code_generator_service'
import OAuthAuthorizationCodeRepository from '#repositories/oauth_authorization_code_repository'
import User from '#models/user'
import OAuthClient from '#models/oauth_client'
import { OAuthParams } from '#validators/oauth_authorize'

test.group('OAuthAutoApprovalService | Unit', (group) => {
  let service: OAuthAutoApprovalService
  let authCodeRepoStub: sinon.SinonStubbedInstance<OAuthAuthorizationCodeRepository>
  let codeGeneratorStub: sinon.SinonStubbedInstance<CodeGeneratorService>

  group.each.setup(() => {
    authCodeRepoStub = sinon.createStubInstance(OAuthAuthorizationCodeRepository)
    codeGeneratorStub = sinon.createStubInstance(CodeGeneratorService)

    app.container.swap(OAuthAuthorizationCodeRepository, () => authCodeRepoStub as any)
    app.container.swap(CodeGeneratorService, () => codeGeneratorStub as any)

    service = new OAuthAutoApprovalService(authCodeRepoStub, codeGeneratorStub)
  })

  group.each.teardown(() => {
    app.container.restore(OAuthAuthorizationCodeRepository)
    app.container.restore(CodeGeneratorService)
    sinon.restore()
  })

  test('approve :: should generate code and return valid redirect URL', async ({ assert }) => {
    const fakeUser = { id: 'user-1' } as User
    const fakeClient = {
      clientId: 'client-1',
      redirectUris: ['https://client.app/callback'],
    } as OAuthClient
    const fakeParams: OAuthParams = {
      client_id: fakeClient.clientId,
      response_type: 'code',
      redirect_uri: fakeClient.redirectUris[0],
      scope: 'openid profile',
      state: 'abc-123-def-456',
    }
    const scopes = ['openid', 'profile']
    const generatedCode = 'generated-auth-code-123'

    // Setup stubs
    codeGeneratorStub.generateAuthorizationCode.returns(generatedCode)
    authCodeRepoStub.create.resolves({} as any)

    const redirectUrl = await service.approve({
      user: fakeUser,
      client: fakeClient,
      params: fakeParams,
      scopes: scopes,
      organizationId: null,
    })

    // Verify redirect URL structure
    const url = new URL(redirectUrl)
    assert.equal(url.origin + url.pathname, fakeClient.redirectUris[0])
    assert.equal(url.searchParams.get('code'), generatedCode)
    assert.equal(url.searchParams.get('state'), fakeParams.state)

    // Verify code generator was called
    assert.isTrue(codeGeneratorStub.generateAuthorizationCode.calledOnce)

    // Verify repository create was called with correct data
    assert.isTrue(authCodeRepoStub.create.calledOnce)
    const createCallArgs = authCodeRepoStub.create.firstCall.args[0]

    assert.equal(createCallArgs.code, generatedCode)
    assert.equal(createCallArgs.clientId, fakeClient.clientId)
    assert.equal(createCallArgs.userId, fakeUser.id)
    assert.equal(createCallArgs.organizationId, null)
    assert.equal(createCallArgs.redirectUri, fakeParams.redirect_uri)
    assert.deepEqual(createCallArgs.scopes, scopes)
    assert.equal(createCallArgs.state, fakeParams.state)
    assert.isTrue(DateTime.isDateTime(createCallArgs.expiresAt))
    assert.isFalse(createCallArgs.isUsed)
  })

  test('approve :: should handle undefined state parameter', async ({ assert }) => {
    const fakeUser = { id: 'user-1' } as User
    const fakeClient = {
      clientId: 'client-1',
      redirectUris: ['https://client.app/callback'],
    } as OAuthClient
    const fakeParams: OAuthParams = {
      client_id: fakeClient.clientId,
      response_type: 'code',
      redirect_uri: fakeClient.redirectUris[0],
      scope: 'openid profile',
      // state is undefined
    }
    const scopes = ['openid', 'profile']
    const generatedCode = 'generated-auth-code-123'

    codeGeneratorStub.generateAuthorizationCode.returns(generatedCode)
    authCodeRepoStub.create.resolves({} as any)

    const redirectUrl = await service.approve({
      user: fakeUser,
      client: fakeClient,
      params: fakeParams,
      scopes: scopes,
      organizationId: null,
    })

    const url = new URL(redirectUrl)
    assert.equal(url.searchParams.get('code'), generatedCode)
    assert.isFalse(url.searchParams.has('state')) // state should not be in URL

    // Verify repository was called with undefined state
    const createCallArgs = authCodeRepoStub.create.firstCall.args[0]
    assert.isUndefined(createCallArgs.state)
  })

  test('approve :: should throw error if code generation fails', async ({ assert }) => {
    const fakeUser = { id: 'user-1' } as User
    const fakeClient = { clientId: 'client-1' } as OAuthClient
    const fakeParams: OAuthParams = {
      client_id: fakeClient.clientId,
      response_type: 'code',
      redirect_uri: 'https://client.app/callback',
      scope: 'openid',
    }
    const scopes = ['openid']

    const codeGenerationError = new Error('Code generation failed')
    codeGeneratorStub.generateAuthorizationCode.throws(codeGenerationError)

    try {
      await service.approve({
        user: fakeUser,
        client: fakeClient,
        params: fakeParams,
        scopes: scopes,
        organizationId: null,
      })
      assert.fail('Expected an error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Code generation failed')
      assert.isFalse(authCodeRepoStub.create.called)
    }
  })
})
