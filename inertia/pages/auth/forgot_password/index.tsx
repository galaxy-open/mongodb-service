import { Head } from '@inertiajs/react'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { AuthLayout } from '@/components/auth/AuthLayout'

interface Props {
  isSent: boolean
}

export default function ForgotPassword({ isSent }: Props) {
  return (
    <>
      <Head title="Reset password" />

      <AuthLayout
        title="Reset password"
        description="Enter your email address and we’ll send you a password reset link."
      >
        <ForgotPasswordForm isSent={isSent} />
      </AuthLayout>
    </>
  )
}
