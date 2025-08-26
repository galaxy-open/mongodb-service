import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const mailConfig = defineConfig({
  default: 'resend',

  /**
   * The mailers object can be used to configure multiple mailers
   * each using a different transport or same transport with different
   * options.
   */
  mailers: {
    resend: transports.resend({
      baseUrl: 'https://api.resend.com',
      key: env.get('RESEND_API_KEY'),

      /**
       * The following options can be overridden at
       * runtime when calling the `mail.send` method.
       */
      tags: [
        {
          name: 'category',
          value: 'password_reset',
        },
      ],
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
