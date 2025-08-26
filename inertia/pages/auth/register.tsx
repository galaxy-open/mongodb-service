import { Head } from '@inertiajs/react'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { RegisterForm } from '@/components/auth/RegisterForm'

export default function Register() {
  return (
    <>
      <Head title="Register" />
      <AuthLayout
        title="Create account"
        description="Experience the future of shipping with Your SaaS"
      >
        <RegisterForm />
      </AuthLayout>
    </>
  )
}
