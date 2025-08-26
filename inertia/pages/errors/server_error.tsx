import { Container, Title, Text, Stack, Center } from '@mantine/core'

export default function ServerError(props: { error: any }) {
  return (
    <Container size="sm">
      <Center h="100vh">
        <Stack gap="md" align="center">
          <Title order={1}>Server Error</Title>
          <Text size="lg">{props.error.message}</Text>
        </Stack>
      </Center>
    </Container>
  )
}
