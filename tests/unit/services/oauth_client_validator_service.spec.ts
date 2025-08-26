import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OAuthClientValidatorService from '#services/oauth_client_validator_service'
import OAuthClientRepository from '#repositories/oauth_client_repository'
import InvalidOauthRequestException from '#exceptions/invalid_oauth_request_exception'
import { OAuthParams } from '#validators/oauth_authorize'
import OAuthClient from '#models/oauth_client'

test.group('OAuthClientValidatorService | Unit', (group) => {
  let service: OAuthClientValidatorService
  let clientRepoStub: sinon.SinonStubbedInstance<OAuthClientRepository>

  group.each.setup(() => {
    clientRepoStub = sinon.createStubInstance(OAuthClientRepository)
    app.container.swap(OAuthClientRepository, () => clientRepoStub as any)
    service = new OAuthClientValidatorService(clientRepoStub)
  })

  group.each.teardown(() => {
    app.container.restore(OAuthClientRepository)
    sinon.restore()
  })

  test('validate :: should throw "invalid_client" if client is not found', async ({ assert }) => {
    clientRepoStub.findById.resolves(null)
    const fakeParams = {
      client_id: 'unknown-client',
      redirect_uri: 'http://foo.com',
    } as OAuthParams

    try {
      await service.validate(fakeParams)
      // If the line above does not throw, the test has failed.
      assert.fail('Expected service.validate() to throw, but it did not.')
    } catch (error) {
      assert.instanceOf(error, InvalidOauthRequestException)
      assert.equal(error.message, 'Invalid client_id')
      assert.equal(error.code, 'E_INVALID_OAUTH_REQUEST')
    }

    assert.isTrue(clientRepoStub.findById.calledOnceWith(fakeParams.client_id))
  })

  test('validate :: should throw "invalid_request" if redirect URI does not match', async ({
    assert,
  }) => {
    const fakeClient = {
      id: 'client-uuid-1',
      redirectUris: ['https://client.app/correct-callback'],
    } as unknown as OAuthClient
    const fakeParams = {
      client_id: fakeClient.id,
      redirect_uri: 'https://client.app/wrong-callback',
    } as OAuthParams
    clientRepoStub.findById.resolves(fakeClient)

    try {
      await service.validate(fakeParams)
      assert.fail('Expected service.validate() to throw, but it did not.')
    } catch (error) {
      assert.instanceOf(error, InvalidOauthRequestException)
      assert.equal(error.message, 'Invalid client or redirect_uri')
      assert.equal(error.code, 'E_INVALID_OAUTH_REQUEST')
    }
  })

  test('validate :: should return the client on successful validation', async ({ assert }) => {
    const fakeClient = {
      id: 'client-uuid-1',
      redirectUris: ['https://client.app/callback'],
    } as unknown as OAuthClient
    const fakeParams = {
      client_id: fakeClient.id,
      redirect_uri: fakeClient.redirectUris[0],
    } as OAuthParams
    clientRepoStub.findById.resolves(fakeClient)

    const result = await service.validate(fakeParams)

    assert.deepEqual(result, fakeClient)
    assert.isTrue(clientRepoStub.findById.calledOnceWith(fakeClient.id))
  })
})
