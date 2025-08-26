import { Exception } from '@adonisjs/core/exceptions'

/**
 * Custom exception to represent invalid OAuth 2.0 requests,
 * such as an invalid client or redirect_uri.
 */
export default class InvalidOAuthRequestException extends Exception {
  // eslint-disable-next-line handle-callback-err
  constructor(
    public error: string,
    public errorDescription: string
  ) {
    super(errorDescription, {
      code: 'E_INVALID_OAUTH_REQUEST',
      status: 400,
    })
  }
}
