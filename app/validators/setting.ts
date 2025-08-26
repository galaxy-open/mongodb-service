import vine from '@vinejs/vine'
import { newEmailRule } from '#validators/auth'

export const updateProfileValidator = vine.compile(
  vine.object({
    username: vine.string().maxLength(254),
  })
)

export const updateEmailValidator = vine.compile(
  vine.object({
    email: newEmailRule.clone(),
    password: vine.string(),
  })
)
