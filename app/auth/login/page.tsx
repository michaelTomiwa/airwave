'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Radio, Waves, Shield } from 'lucide-react'
import { Card, PageContainer, PageFrame, SectionTitle, TonePill, buttonClassName, inputClassName } from '@/components/AppUi'
import { demoAccounts } from '@/lib/constants'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (!result || result.error) {
      toast.error('Incorrect email or password.')
      return
    }

    const session = await getSession()
    const role = session?.user?.role
    const destination = callbackUrl ?? (role === 'ADMIN' ? '/admin' : role === 'BROADCASTER' ? '/studio' : '/discover')
    toast.success(`Welcome back${session?.user?.name ? `, ${session.user.name}` : ''}.`)
    router.push(destination)
    router.refresh()
  }

  function useDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword('demo123')
  }

  return (
    <PageFrame>
      <PageContainer>
        <section className="mx-auto grid max-w-5xl gap-6 py-10 lg:grid-cols-[1fr_0.85fr] lg:py-16">
          <Card>
            <p className="text-xs uppercase tracking-[0.34em] text-fuchsia-300">Welcome back</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Log in to AIRWAVE</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Listen live, manage your station, or moderate the platform — all from one account.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={loading} className={`${buttonClassName} w-full`}>
                {loading ? 'Signing in…' : 'Log in'}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-400">
              New to AIRWAVE?{' '}
              <a href="/auth/signup" className="text-fuchsia-300 hover:text-fuchsia-200">
                Create an account
              </a>
            </p>
          </Card>

          <Card>
            <SectionTitle title="Try a demo account" description="Password for every demo account is demo123." />
            <div className="mt-5 space-y-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => useDemo(account.email)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                >
                  <div>
                    <p className="font-semibold text-white">{account.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{account.email}</p>
                  </div>
                  <TonePill tone={account.role === 'ADMIN' ? 'amber' : account.role === 'BROADCASTER' ? 'cyan' : 'violet'}>
                    {account.role === 'ADMIN' ? <Shield className="mr-1 h-3 w-3" /> : account.role === 'BROADCASTER' ? <Waves className="mr-1 h-3 w-3" /> : <Radio className="mr-1 h-3 w-3" />}
                    {account.role.toLowerCase()}
                  </TonePill>
                </button>
              ))}
            </div>
          </Card>
        </section>
      </PageContainer>
    </PageFrame>
  )
}
