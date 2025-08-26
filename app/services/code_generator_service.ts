import { inject } from '@adonisjs/core'
import crypto from 'node:crypto'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

@inject()
export default class CodeGeneratorService {
  /**
   * Generate a secure random code using URL-safe base64
   * This removes +, /, and = characters to make it URL-safe
   */
  private generateSecureCode(length: number = 32): string {
    // Generate more bytes than needed since we'll be removing some characters
    const bytes = Math.ceil((length * 3) / 4)
    return crypto
      .randomBytes(bytes)
      .toString('base64url') // URL-safe base64 (no +, /, or =)
      .slice(0, length)
  }

  /**
   * Generate a secure authorization code
   */
  generateAuthorizationCode(): string {
    return this.generateSecureCode()
  }

  /**
   * Generate a secure access token
   */
  generateAccessToken(): string {
    return this.generateSecureCode()
  }

  /**
   * Generate a secure refresh token
   */
  generateRefreshToken(): string {
    return this.generateSecureCode()
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(): TokenPair {
    return {
      accessToken: this.generateAccessToken(),
      refreshToken: this.generateRefreshToken(),
    }
  }

  /**
   * Generate a unique authorization code (alias for consistency)
   */
  generateUniqueCode(): string {
    return this.generateAuthorizationCode()
  }

  /**
   * Generate a secure password
   */
  generatePassword(length: number = 16): string {
    return this.generateSecureCode(length)
  }

  /**
   * Generate a MongoDB replica key (base64 encoded)
   * MongoDB requires 6-1024 base64 characters for replica keys
   */
  generateMongoReplicaKey(): string {
    // Generate 9 random bytes which will produce 12 base64 characters
    // This provides 72 bits of entropy while keeping the key compact
    return crypto.randomBytes(9).toString('base64')
  }
}
