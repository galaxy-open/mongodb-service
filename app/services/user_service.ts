import UserRepository from '#repositories/user_repository'
import { inject } from '@adonisjs/core'

@inject()
export default class UserService {
  constructor(private userRepository: UserRepository) {}

  public async findByEmail(email: string) {
    return this.userRepository.findByEmail(email)
  }
}
