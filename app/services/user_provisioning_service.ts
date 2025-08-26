import { inject } from '@adonisjs/core'
import UserRepository from '#repositories/user_repository'
import logger from '@adonisjs/core/services/logger'
import type User from '#models/user'

export type JITUserData = {
  email: string
  username: string
  externalIdpId: string
  externalUserId: string
}

@inject()
export default class UserProvisioningService {
  constructor(protected userRepository: UserRepository) {}

  /**
   * Creates a new user or links an existing user with external identity provider data.
   *
   * @param userData The user data from external identity provider
   * @returns The created or linked user
   */
  async provisionUser(userData: JITUserData): Promise<User> {
    const user = await this.userRepository.findByEmail(userData.email)

    // If the user exists, check if we need to link them to the external provider
    if (user) {
      // Return the user as-is if already linked
      if (user.externalIdpId && user.externalUserId) {
        return user
      }

      // Otherwise, link the user to the external provider
      return await this.linkUserToExternalProvider(user, userData)
    }

    // User doesn't exist, create a new one
    return await this.createNewJITUser(userData)
  }

  /**
   * Links an existing user to an external identity provider
   */
  private async linkUserToExternalProvider(user: User, userData: JITUserData): Promise<User> {
    logger.info(
      `Linking existing user ${user.email} to external provider ${userData.externalIdpId}`
    )

    await user
      .merge({
        externalIdpId: userData.externalIdpId,
        externalUserId: userData.externalUserId,
      })
      .save()

    return user
  }

  /**
   * Creates a new JIT user from external provider data
   */
  private async createNewJITUser(userData: JITUserData): Promise<User> {
    const user = await this.userRepository.createJITUser({
      email: userData.email,
      username: userData.username,
      externalIdpId: userData.externalIdpId,
      externalUserId: userData.externalUserId,
    })

    logger.info(`JIT User provisioned: ${user.email} from provider ${userData.externalIdpId}`)
    return user
  }
}
