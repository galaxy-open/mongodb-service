import { Group, Button, Container, Box, Divider } from '@mantine/core'
import { Link } from '@inertiajs/react'

export default function PublicHome() {
  return (
    <Box py="md">
      <Container size="xl">
        <Group justify="space-between">
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <strong>Your Logo</strong>
          </Link>

          <Group gap="xs">
            <Button component={Link} href="/login" variant="subtle">
              Login
            </Button>
            <Button component={Link} href="/register" variant="outline">
              Sign up
            </Button>
          </Group>
        </Group>
      </Container>
      <Divider w="100%" mt="md" />
    </Box>
  )
}
