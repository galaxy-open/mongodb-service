import { AppShell } from '@mantine/core'
import { Header } from './Header'

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell h="100vh" header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
