import { Group, Avatar, Text, Button, Menu, Box, TextInput } from '@mantine/core'
import { Link, usePage } from '@inertiajs/react'
import { SharedProps } from '@adonisjs/inertia/types'

export function Header() {
  const {
    props: { user },
  } = usePage<SharedProps>()

  const initial = user?.name?.charAt(0) || user?.email.charAt(0).toUpperCase()

  return (
    <Box px="md" h={60}>
      <Group h="100%" justify="space-between">
        {/* Left section */}
        <Group>
          <Link href="/" style={{ textDecoration: 'none' }}>
            Logo
          </Link>
          <Text>{user?.name}</Text>
        </Group>

        {/* Center section */}
        <Group>
          <TextInput
            placeholder="Search"
            rightSection={
              <Box p={4} style={{ background: '#f1f3f5', borderRadius: 4 }}>
                <Text size="xs" c="gray.6">
                  ⌘K
                </Text>
              </Box>
            }
            styles={{
              input: {
                minWidth: '300px',
                background: 'transparent',
                border: '1px solid #e9ecef',
              },
            }}
          />
        </Group>

        {/* Right section */}
        <Group>
          <Text component={Link} href="/docs" c="gray.6" style={{ textDecoration: 'none' }}>
            Docs
          </Text>
          <Text component={Link} href="/help" c="gray.6" style={{ textDecoration: 'none' }}>
            Help
          </Text>
          <Button component={Link} href="/subscribe" variant="filled" leftSection={<span>↑</span>}>
            Subscribe
          </Button>
          <Menu>
            <Menu.Target>
              <Avatar radius="xl" color="blue">
                {initial}
              </Avatar>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item component={Link} href="/account">
                Account
              </Menu.Item>
              <Menu.Item component={Link} href="/logout" method="post" as="button">
                Sign out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Box>
  )
}
