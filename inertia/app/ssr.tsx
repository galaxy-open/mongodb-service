import ReactDOMServer from 'react-dom/server'
import { createInertiaApp } from '@inertiajs/react'
import { sharedAppConfig } from './shared_app_config'
import { StylesProvider } from '@/styles/StylesProvider'
export default function render(page: any) {
  return createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    title: sharedAppConfig.title,
    resolve: (name) => {
      const pages = import.meta.glob('../pages/**/*.tsx', { eager: true })
      return pages[`../pages/${name}.tsx`]
    },
    setup: ({ App, props }) => (
      <StylesProvider>
        <App {...props} />
      </StylesProvider>
    ),
  })
}
