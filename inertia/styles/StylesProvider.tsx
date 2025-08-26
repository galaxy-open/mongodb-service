import '@mantine/core/styles.css'

import './style.css'

import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core'
import { shadcnCssVariableResolver } from './css_variable_resolver'
import { shadcnTheme } from './theme'

export function StylesProvider({ children }: { children: React.ReactNode }) {
  const colorSchemeManager = localStorageColorSchemeManager({ key: 'dark' })
  return (
    <MantineProvider
      colorSchemeManager={colorSchemeManager}
      defaultColorScheme="dark"
      theme={shadcnTheme}
      cssVariablesResolver={shadcnCssVariableResolver}
    >
      {children}
    </MantineProvider>
  )
}
