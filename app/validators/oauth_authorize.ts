import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const authorizeValidator = vine.compile(
  vine.object({
    response_type: vine.string().trim().in(['code']),
    client_id: vine.string().trim(),
    redirect_uri: vine.string().trim(),
    scope: vine.string().trim().optional(),
    state: vine.string().trim().optional(),
    id_token_hint: vine.string().optional(),
  })
)

export type OAuthParams = Infer<typeof authorizeValidator>
