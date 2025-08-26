/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import { hydrateRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { sharedAppConfig } from './shared_app_config'
import { StylesProvider } from '@/styles/StylesProvider'

createInertiaApp({
  progress: { color: '#5468FF' },

  title: sharedAppConfig.title,

  resolve: (name) => {
    return resolvePageComponent(`../pages/${name}.tsx`, import.meta.glob('../pages/**/*.tsx'))
  },

  setup({ el, App, props }) {
    hydrateRoot(
      el,
      <StylesProvider>
        <App {...props} />
      </StylesProvider>
    )
  },
})
