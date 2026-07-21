'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Compass, LogOut, Radio, Shield, Waves, Zap } from 'lucide-react'
import { productIdentity } from '../lib/constants'
import { NotificationBell } from './NotificationBell'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()

  if (pathname?.startsWith('/embed/')) return null

  const navItems = [
    { label: 'Discover', href: '/discover' },
    { label: 'Pricing', href: '/pricing' },
    ...(session?.user
      ? [
          { label: 'Dashboard', href: '/dashboard' },
          ...(session.user.role === 'BROADCASTER' ? [{ label: 'Studio', href: '/studio' }] : []),
          ...(session.user.role === 'ADMIN' ? [{ label: 'Admin', href: '/admin' }] : []),
        ]
      : []),
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060913]/88 backdrop-blur-xl">
      <div className="mx-auto max-w-[1500px] px-6 py-4 lg:px-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="flex items-center gap-3 text-white">
              <span className="grid h-12 w-12 place-items-center rounded-3xl bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-300/20">
                <Zap className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-fuchsia-200">{productIdentity.name}</p>
                <p className="text-xs text-slate-400">{productIdentity.tagline}</p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              {status === 'authenticated' && session.user ? (
                <>
                  <NotificationBell />
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100">
                    {session.user.role === 'ADMIN' ? <Shield className="h-3.5 w-3.5" /> : session.user.role === 'BROADCASTER' ? <Waves className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}
                    {session.user.name}
                  </span>
                  <button
                    onClick={() => signOut({ redirect: false }).then(() => router.push('/'))}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </>
              ) : status === 'unauthenticated' ? (
                <>
                  <Link href="/discover" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10">
                    <Compass className="h-3.5 w-3.5" />
                    Discover
                  </Link>
                  <Link href="/auth/login" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10">
                    Log in
                  </Link>
                  <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white transition hover:bg-fuchsia-400">
                    Sign up
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'rounded-full border px-4 py-2 text-sm transition',
                  pathname === item.href
                    ? 'border-fuchsia-400/30 bg-fuchsia-500/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
