import { ConsentData } from '#services/oauth_consent_data_service'
import { Head, useForm } from '@inertiajs/react'
import {
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Button,
  List,
  ThemeIcon,
  Box,
  Divider,
  Center,
} from '@mantine/core'
import { IconCheck, IconX, IconShield } from '@tabler/icons-react'

export default function Consent({ client, scopes, user }: ConsentData) {
  const form = useForm<{
    decision?: 'approve' | 'deny'
  }>({
    decision: undefined,
  })

  const handleDecision = (decision: 'approve' | 'deny') => {
    form.transform((data) => ({ ...data, decision }))
    form.post('/oauth/consent')
  }

  return (
    <>
      <Head title="OAuth Authorization" />
      <Center h="100vh">
        <Stack gap="lg" align="center">
          <Stack gap="xs" ta="center">
            <Title order={1}>Authorize Application</Title>
            <Text c="dimmed" size="sm">
              <strong>"{client.name}"</strong> is requesting access to manage your account
            </Text>
            <Text c="orange" size="xs">
              Only authorize applications you trust
            </Text>
          </Stack>

          <Paper shadow="md" p="xl" radius="md" w="100%">
            <Stack gap="lg">
              <Box>
                <Title order={4} size="h5" mb="md">
                  Requested Permissions:
                </Title>
                <List
                  spacing="sm"
                  icon={
                    <ThemeIcon color="green" size="sm" radius="xl">
                      <IconCheck size={12} />
                    </ThemeIcon>
                  }
                >
                  {scopes.map((scope) => (
                    <List.Item key={scope.scope}>
                      <Text size="sm" fw="bold">
                        {scope.scope}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {scope.description}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              </Box>

              <Divider />

              <Box>
                <Text size="sm" c="dimmed">
                  Authorizing as:{' '}
                  <Text span fw={500} inherit>
                    {user?.username}
                  </Text>{' '}
                  ({user?.email})
                </Text>
              </Box>

              <Group gap="md" grow>
                <Button
                  variant="default"
                  fullWidth
                  leftSection={<IconX size={16} />}
                  disabled={form.processing}
                  onClick={() => handleDecision('deny')}
                >
                  Deny
                </Button>
                <Button
                  fullWidth
                  leftSection={<IconShield size={14} />}
                  loading={form.processing}
                  onClick={() => handleDecision('approve')}
                >
                  Authorize
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Center>
    </>
  )
}
