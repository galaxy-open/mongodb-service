import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import type User from '#models/user'
import app from '@adonisjs/core/services/app'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    user: (ctx) => {
      const user = ctx.auth.use('web').user
      return user?.serialize() ?? null
    },
    messages: (ctx) => ctx.session.flashMessages.all() ?? {},
  },

  /**
   * Options for the server-side rendering
   * Disabled during tests to avoid URL parsing issues
   */
  ssr: {
    enabled: app.inProduction,
    entrypoint: 'inertia/app/ssr.tsx',
    pages: (_, page) => !page.includes('app'),
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {
    user: ReturnType<User['serialize']> | null
  }
}
