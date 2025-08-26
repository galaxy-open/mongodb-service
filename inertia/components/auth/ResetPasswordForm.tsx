import { useForm, Link } from '@inertiajs/react'
import { TextInput, PasswordInput, Button, Stack, Alert, Anchor } from '@mantine/core'
import { IconAlertCircle, IconLoader2, IconChevronRight } from '@tabler/icons-react'

interface Props {
  value: string
  isValid: boolean
  email: string | null
}

export function ResetPasswordForm({ value, isValid, email }: Props) {
  const form = useForm({
    value,
    password: '',
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    form.post('/forgot-password/reset', {
      onSuccess: () => form.reset(),
      preserveScroll: true,
    })
  }

  return (
    <>
      {!isValid ? (
        <Stack gap="xl">
          <Alert
            color="red"
            title="Password Reset Link Invalid"
            icon={<IconAlertCircle size={16} />}
            variant="light"
          >
            This password reset link is invalid or has expired. Please try again.
          </Alert>

          <Button component={Link} href="/forgot-password" fullWidth>
            Request New Password Reset Link <IconChevronRight size={16} />
          </Button>
        </Stack>
      ) : (
        <form onSubmit={onSubmit}>
          <Stack gap="xl">
            <TextInput label="Email" type="email" value={email || ''} disabled />

            <PasswordInput
              label="New Password"
              placeholder="Your new password"
              description="Must be at least 12 characters in length"
              value={form.data.password}
              onChange={(e) => form.setData('password', e.target.value)}
              error={form.errors.password}
            />

            <Button type="submit" fullWidth mt="md" disabled={form.processing}>
              {form.processing ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  Reset Password <IconChevronRight size={16} />
                </>
              )}
            </Button>

            <Anchor component={Link} href="/login" size="sm" underline="hover">
              Got back to Sign in
            </Anchor>
          </Stack>
        </form>
      )}
    </>
  )
}
