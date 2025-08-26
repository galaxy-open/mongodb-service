import { Head } from '@inertiajs/react'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { AuthLayout } from '@/components/auth/AuthLayout'

interface Props {
  value: string
  isValid: boolean
  email: string | null
}

export default function PasswordReset({ value, isValid, email }: Props) {
  return (
    <>
      <Head title="Reset Password" />

      <AuthLayout
        title="Reset Your Password"
        description="Please enter your desired new password below"
      >
        <ResetPasswordForm value={value} isValid={isValid} email={email} />
      </AuthLayout>
    </>
  )
}
