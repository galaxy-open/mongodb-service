import { Link, useForm } from '@inertiajs/react'
import { TextInput, Button, Stack, Alert, Anchor } from '@mantine/core'
import { IconAlertCircle, IconLoader2, IconChevronRight } from '@tabler/icons-react'

interface Props {
  isSent: boolean
}

export function ForgotPasswordForm({ isSent }: Props) {
  const form = useForm({
    email: '',
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    form.post('/forgot-password', {
      onSuccess: () => form.reset(),
      preserveScroll: true,
    })
  }

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="xl">
        {isSent && (
          <Alert
            color="blue"
            title="Please Check Your Email"
            icon={<IconAlertCircle size={16} />}
            variant="light"
          >
            We have sent a password reset link to your email. Please check your email and click on
            the link to reset your password.
          </Alert>
        )}

        <TextInput
          label="Email"
          placeholder="your@email.com"
          type="email"
          value={form.data.email}
          onChange={(e) => form.setData('email', e.target.value)}
          error={form.errors.email}
        />

        <Button type="submit" fullWidth mt="md" disabled={form.processing}>
          {form.processing ? (
            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              Send password reset link <IconChevronRight size={16} />
            </>
          )}
        </Button>

        <Anchor component={Link} href="/login" size="sm" underline="hover">
          Got back to Sign in
        </Anchor>
      </Stack>
    </form>
  )
}
