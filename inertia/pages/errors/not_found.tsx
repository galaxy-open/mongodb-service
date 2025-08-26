import { Container, Title, Text, Stack, Center } from '@mantine/core'

export default function NotFound() {
  return (
    <Container size="sm">
      <Center h="100vh">
        <Stack gap="md" align="center">
          <Title order={1}>Page not found</Title>
          <Text size="lg">This page does not exist.</Text>
        </Stack>
      </Center>
    </Container>
  )
}
