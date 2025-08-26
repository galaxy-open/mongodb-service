import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OAuthConsentDataService from '#services/oauth_consent_data_service'
import OAuthClientValidatorService from '#services/oauth_client_validator_service'
import { OAuthParams } from '#validators/oauth_authorize'
import UserFactory from '#database/factories/user_factory'
import { OAuthClientFactory } from '#database/factories/oauth_client_factory'
import User from '#models/user'
import OAuthClient from '#models/oauth_client'

test.group('OAuthConsentDataService | Unit', (group) => {
  let service: OAuthConsentDataService
  let clientValidatorStub: sinon.SinonStubbedInstance<OAuthClientValidatorService>
  let fakeUser: User
  let fakeClient: OAuthClient

  const fakeParams: OAuthParams = {
    client_id: 'test-client',
    response_type: 'code',
    redirect_uri: 'https://client.app/callback',
    scope: 'database:read database:write',
  }

  group.each.setup(async () => {
    clientValidatorStub = sinon.createStubInstance(OAuthClientValidatorService)

    app.container.swap(OAuthClientValidatorService, () => clientValidatorStub as any)

    fakeUser = await UserFactory.make()
    // Mock the username getter to return the expected value
    Object.defineProperty(fakeUser, 'username', {
      get: () => 'testuser',
      configurable: true,
    })

    fakeClient = await OAuthClientFactory.merge({
      clientId: fakeParams.client_id,
      clientName: 'Test Client',
    }).make()

    service = new OAuthConsentDataService(clientValidatorStub)
  })

  group.each.teardown(() => {
    app.container.restore(OAuthClientValidatorService)
    sinon.restore()
  })

  test('getConsentData :: should return consent data for authenticated user', async ({
    assert,
  }) => {
    clientValidatorStub.validate.resolves(fakeClient)

    const result = await service.getConsentData(fakeParams, fakeUser)

    assert.deepEqual(result, {
      client: { name: fakeClient.clientName, id: fakeParams.client_id },
      scopes: [
        {
          scope: 'database:read',
          description: 'View your databases',
          category: 'database',
          isDefault: true,
        },
        {
          scope: 'database:write',
          description: 'Manage your databases',
          category: 'database',
          isDefault: false,
        },
      ],
      user: { username: fakeUser.username, email: fakeUser.email },
    })
  })

  test('getConsentData :: should use default scope when none provided', async ({ assert }) => {
    const paramsWithoutScope = { ...fakeParams, scope: undefined }
    clientValidatorStub.validate.resolves(fakeClient)

    const result = await service.getConsentData(paramsWithoutScope, fakeUser)

    assert.deepEqual((result as any).scopes, [
      {
        scope: 'database:read',
        description: 'View your databases',
        category: 'database',
        isDefault: true,
      },
    ])
  })
})
