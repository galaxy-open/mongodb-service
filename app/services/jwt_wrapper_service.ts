import { createRemoteJWKSet, decodeJwt, type JWTPayload, jwtVerify } from 'jose'

export type JWTPayloadType = JWTPayload

export default class JwtWrapperService {
  async jwtVerify(jwt: string, key: any, options?: any) {
    return jwtVerify(jwt, key, options)
  }

  decodeJwt(jwt: string) {
    return decodeJwt(jwt)
  }

  createRemoteJWKSet(url: URL) {
    return createRemoteJWKSet(url)
  }
}
