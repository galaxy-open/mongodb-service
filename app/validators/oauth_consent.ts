import vine from '@vinejs/vine'

export const consentValidator = vine.compile(
  vine.object({
    decision: vine.string().in(['approve', 'deny']),
  })
)
