import { test } from '@japa/runner'
import CodeGeneratorService from '#services/code_generator_service'

test.group('CodeGeneratorService', () => {
  test('should generate an authorization code', async ({ assert }) => {
    const service = new CodeGeneratorService()
    const code = service.generateAuthorizationCode()

    assert.isString(code)
    assert.isAbove(code.length, 0)
  })

  test('should generate an access token', async ({ assert }) => {
    const service = new CodeGeneratorService()
    const token = service.generateAccessToken()

    assert.isString(token)
    assert.isAbove(token.length, 0)
  })

  test('should generate a refresh token', async ({ assert }) => {
    const service = new CodeGeneratorService()
    const token = service.generateRefreshToken()

    assert.isString(token)
    assert.isAbove(token.length, 0)
  })

  test('should generate a token pair', async ({ assert }) => {
    const service = new CodeGeneratorService()
    const { accessToken, refreshToken } = service.generateTokenPair()

    assert.isString(accessToken)
    assert.isString(refreshToken)
    assert.isAbove(accessToken.length, 0)
    assert.isAbove(refreshToken.length, 0)
    assert.notEqual(accessToken, refreshToken)
  })

  test('should generate unique codes each time', async ({ assert }) => {
    const service = new CodeGeneratorService()

    const code1 = service.generateAuthorizationCode()
    const code2 = service.generateAuthorizationCode()
    const token1 = service.generateAccessToken()
    const token2 = service.generateAccessToken()

    assert.notEqual(code1, code2)
    assert.notEqual(token1, token2)
    assert.notEqual(code1, token1)
  })
})
