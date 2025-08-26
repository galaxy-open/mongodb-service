import { Head } from '@inertiajs/react'
import { Paper, Title, Text, Stack, Button, ThemeIcon, Center, Group, Anchor } from '@mantine/core'
import { IconAlertTriangle, IconArrowLeft, IconHome } from '@tabler/icons-react'
import { Link } from '@inertiajs/react'

interface OAuthErrorProps {
  error?: string
  errorDescription?: string
}

export default function OAuthError({ error, errorDescription }: OAuthErrorProps) {
  return (
    <>
      <Head title="OAuth Authorization Error" />
      <Center h="100vh">
        <Stack gap="lg" align="center">
          <Stack gap="xs" ta="center">
            <ThemeIcon color="red" size="xl" radius="xl" mx="auto">
              <IconAlertTriangle size={32} />
            </ThemeIcon>
            <Title order={1} c="red">
              Authorization Error
            </Title>
            <Text c="dimmed" size="sm">
              There was a problem with the OAuth authorization request
            </Text>
          </Stack>

          <Paper shadow="md" p="xl" radius="md" w="100%" maw={480}>
            <Stack gap="lg">
              <Stack gap="md">
                <Title order={4} size="h5">
                  Error Details
                </Title>

                <Stack gap="xs">
                  <Text size="sm" fw="bold" c="red">
                    {error
                      ? error.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                      : 'Unknown Error'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {errorDescription || 'An unexpected error occurred during OAuth authorization.'}
                  </Text>
                </Stack>
              </Stack>

              <Group gap="md" grow>
                <Button
                  variant="default"
                  fullWidth
                  leftSection={<IconArrowLeft size={16} />}
                  component="button"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </Button>
                <Button fullWidth leftSection={<IconHome size={16} />} component={Link} href="/">
                  Home
                </Button>
              </Group>

              <Text size="xs" c="dimmed" ta="center">
                If you believe this is an error, please contact the application developer or{' '}
                <Anchor size="xs" href="/help" underline="hover">
                  get help
                </Anchor>
                .
              </Text>
            </Stack>
          </Paper>
        </Stack>
      </Center>
    </>
  )
}
