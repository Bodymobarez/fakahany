'use client';

import { Link } from '@/i18n/routing';
import { RegisterForm } from './RegisterForm';

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 md:py-14">
      <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-8 shadow-sm sm:px-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Create Account
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Join us and start shopping for farm-fresh produce
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-leaf-700 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
