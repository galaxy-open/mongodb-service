import { Stack, Title, Text, Box, Anchor, Flex, Group } from '@mantine/core'
import { Link } from '@inertiajs/react'

type AuthLayoutProps = {
  children: React.ReactNode
  title: string
  description: string
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <Flex h="100vh" align="stretch">
      {/* Left side - Form */}
      <Flex direction="column" w="50%" p="3xl">
        <Stack gap="4xl">
          {/* Logo */}
          <Title order={4} fw="bolder" mb="xl">
            Your SaaS
          </Title>

          <Box>
            <Title order={3} fw={300} mb={0}>
              {title}
            </Title>

            <Text c="dimmed">{description}</Text>
          </Box>

          {children}
        </Stack>

        <Group align="center" mt="auto" justify="space-between">
          <Text size="sm" c="dimmed" ta="center" mt="auto">
            © Your SaaS {new Date().getFullYear()}
          </Text>

          <Group gap="xs">
            <Anchor size="sm" fw={500} component={Link} href="/status" underline="hover">
              Status
            </Anchor>
            <Anchor size="sm" fw={500} component={Link} href="/docs" underline="hover">
              Docs
            </Anchor>
            <Anchor size="sm" fw={500} component={Link} href="/help" underline="hover">
              Help
            </Anchor>
            <Anchor size="sm" fw={500} component={Link} href="/legal" underline="hover">
              Legal
            </Anchor>
          </Group>
        </Group>
      </Flex>

      {/* Right side - Dashboard Preview */}
      <Flex w="50%" bg="gray.1" align="center" justify="center">
        Image
      </Flex>
    </Flex>
  )
}
