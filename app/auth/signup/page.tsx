'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Card, PageContainer, PageFrame, SectionTitle, buttonClassName, inputClassName, secondaryButtonClassName } from '@/components/AppUi'
import { categories } from '@/lib/constants'

type Mode = 'LISTENER' | 'BROADCASTER'

export default function SignupPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('LISTENER')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    country: 'Nigeria',
    stationName: '',
    category: categories[0],
    description: '',
    language: 'English',
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    const payload =
      mode === 'LISTENER'
        ? { role: 'LISTENER', name: form.name, email: form.email, username: form.username, password: form.password, phone: form.phone, country: form.country }
        : {
            role: 'BROADCASTER',
            name: form.name,
            email: form.email,
            username: form.username,
            password: form.password,
            phone: form.phone,
            country: form.country,
            stationName: form.stationName,
            category: form.category,
            description: form.description,
            language: form.language,
          }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()

    if (!json.ok) {
      toast.error(json.message ?? 'Could not create your account.')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    setLoading(false)

    if (!result || result.error) {
      toast.success('Account created — please log in.')
      router.push('/auth/login')
      return
    }

    if (mode === 'BROADCASTER') {
      toast.success('Station submitted! It will go live once an admin approves it.')
      router.push('/studio')
    } else {
      toast.success('Welcome to AIRWAVE!')
      router.push('/discover')
    }
    router.refresh()
  }

  return (
    <PageFrame>
      <PageContainer>
        <section className="mx-auto max-w-3xl py-10 lg:py-16">
          <Card>
            <p className="text-xs uppercase tracking-[0.34em] text-fuchsia-300">Join AIRWAVE</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Create your account</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">Listen for free, or start your own station in minutes.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMode('LISTENER')} className={mode === 'LISTENER' ? buttonClassName : secondaryButtonClassName}>
                I'm a listener
              </button>
              <button type="button" onClick={() => setMode('BROADCASTER')} className={mode === 'BROADCASTER' ? buttonClassName : secondaryButtonClassName}>
                I want to broadcast
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <SectionTitle title="Your details" />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <input required value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClassName} />
                  </Field>
                  <Field label="Username">
                    <input required value={form.username} onChange={(e) => update('username', e.target.value)} className={inputClassName} placeholder="lowercase, no spaces" />
                  </Field>
                  <Field label="Email">
                    <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClassName} />
                  </Field>
                  <Field label="Password">
                    <input required type="password" minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)} className={inputClassName} />
                  </Field>
                  <Field label="Phone">
                    <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClassName} />
                  </Field>
                  <Field label="Country">
                    <input value={form.country} onChange={(e) => update('country', e.target.value)} className={inputClassName} />
                  </Field>
                </div>
              </div>

              {mode === 'BROADCASTER' ? (
                <div>
                  <SectionTitle title="Your station" description="Submitted for admin approval before you can go live." />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Station name">
                      <input required value={form.stationName} onChange={(e) => update('stationName', e.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="Category">
                      <select value={form.category} onChange={(e) => update('category', e.target.value)} className={inputClassName}>
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Language">
                      <input value={form.language} onChange={(e) => update('language', e.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="Description" full>
                      <textarea
                        required
                        minLength={10}
                        rows={3}
                        value={form.description}
                        onChange={(e) => update('description', e.target.value)}
                        className={inputClassName}
                        placeholder="What do listeners tune in for?"
                      />
                    </Field>
                  </div>
                </div>
              ) : null}

              <button type="submit" disabled={loading} className={`${buttonClassName} w-full`}>
                {loading ? 'Creating account…' : mode === 'LISTENER' ? 'Create listener account' : 'Create broadcaster account'}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-400">
              Already have an account?{' '}
              <a href="/auth/login" className="text-fuchsia-300 hover:text-fuchsia-200">
                Log in
              </a>
            </p>
          </Card>
        </section>
      </PageContainer>
    </PageFrame>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">{label}</label>
      {children}
    </div>
  )
}
