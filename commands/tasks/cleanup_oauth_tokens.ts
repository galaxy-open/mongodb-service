import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import OAuthCleanupService from '#services/oauth_cleanup_service'
import { schedule } from 'adonisjs-scheduler'
import { inject } from '@adonisjs/core'

@schedule((s) => s.hourly())
export default class CleanupOauthTokens extends BaseCommand {
  static commandName = 'oauth:cleanup'
  static description = 'Clean up expired OAuth tokens and authorization codes'

  static options: CommandOptions = {
    startApp: true,
  }

  @inject()
  async run(oAuthCleanupService: OAuthCleanupService) {
    this.logger.info('Starting OAuth token cleanup...')

    try {
      await oAuthCleanupService.cleanupExpiredTokens()
      this.logger.success('OAuth token cleanup completed successfully')
    } catch (error) {
      this.logger.error('OAuth token cleanup failed:', error)
      this.exitCode = 1
    }
  }
}
