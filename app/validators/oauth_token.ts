import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const tokenValidator = vine.compile(
  vine.object({
    grant_type: vine.string().trim().in(['authorization_code', 'refresh_token']),
    client_id: vine.string().trim(),
    client_secret: vine.string().trim(),

    // For authorization_code grant
    code: vine.string().trim().optional(),
    redirect_uri: vine.string().trim().optional(),

    // For refresh_token grant
    refresh_token: vine.string().trim().optional(),

    // Optional scope for refresh token grant
    scope: vine.string().trim().optional(),
  })
)

export type OAuthTokenParams = Infer<typeof tokenValidator>
