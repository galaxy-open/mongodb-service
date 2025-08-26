import { Anchor, Button, PasswordInput, TextInput, Text } from '@mantine/core'
import { Link, useForm } from '@inertiajs/react'
import { Stack } from '@mantine/core'
import { IconChevronRight } from '@tabler/icons-react'
import { FormEvent } from 'react'

export function RegisterForm() {
  const form = useForm({
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    form.post('/register')
  }

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="xl">
        <TextInput
          label="Username"
          placeholder="Your username"
          value={form.data.username}
          onChange={(e) => form.setData('username', e.target.value)}
          error={form.errors.username}
        />

        <TextInput
          label="Email"
          placeholder="your@email.com"
          type="email"
          value={form.data.email}
          onChange={(e) => form.setData('email', e.target.value)}
          error={form.errors.email}
        />

        <PasswordInput
          label="Password"
          placeholder="Your password"
          description="Must be at least 12 characters in length"
          value={form.data.password}
          onChange={(e) => form.setData('password', e.target.value)}
          error={form.errors.password}
        />

        <PasswordInput
          label="Confirm password"
          placeholder="Confirm your password"
          value={form.data.password_confirmation}
          onChange={(e) => form.setData('password_confirmation', e.target.value)}
          error={form.errors.password_confirmation}
        />

        <Button type="submit" fullWidth mt="md">
          Continue <IconChevronRight size={16} />
        </Button>

        <Text size="sm" mt="md">
          By creating an account you agree to our{' '}
          <Anchor component={Link} href="/terms" underline="hover">
            Terms of Service
          </Anchor>{' '}
          and{' '}
          <Anchor component={Link} href="/privacy" underline="hover">
            Privacy Policy
          </Anchor>
        </Text>

        <Text size="sm" mt="md">
          Already have an account?{' '}
          <Anchor component={Link} href="/login" underline="hover">
            Sign in
          </Anchor>
        </Text>
      </Stack>
    </form>
  )
}
