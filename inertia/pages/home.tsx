import { Text, Container } from '@mantine/core'
import PrivateLayout from '@/components/private-layout/PrivateLayout'
import { Head } from '@inertiajs/react'

export default function PrivateHome() {
  return (
    <>
      <Head title="Dashboard" />
      <PrivateLayout>
        <Container size="xl">
          <Text size="xl" fw={700} mb="md">
            Dashboard
          </Text>
          <Text>Welcome to your dashboard!</Text>
        </Container>
      </PrivateLayout>
    </>
  )
}
