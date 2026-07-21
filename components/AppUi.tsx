import Link from 'next/link'
import type { ReactNode } from 'react'

type Tone = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate'

const toneMap: Record<Tone, string> = {
  violet: 'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100',
  cyan: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100',
  emerald: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  amber: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  rose: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
  slate: 'border-white/10 bg-white/5 text-slate-200',
}

export const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-[#0c1118] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-fuchsia-400/40 focus:bg-white/[0.06]'

export const buttonClassName =
  'inline-flex items-center justify-center rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-slate-700'

export const secondaryButtonClassName =
  'inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10'

export function PageFrame({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-[linear-gradient(180deg,#050811_0%,#080c14_100%)] text-slate-100">{children}</main>
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: Array<{ label: string; href: string }>
  aside?: ReactNode
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.16),transparent_34%),linear-gradient(135deg,rgba(13,17,24,0.96),rgba(16,20,31,0.92))]">
        <p className="text-xs uppercase tracking-[0.34em] text-slate-400">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{description}</p>
        {actions && actions.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className={secondaryButtonClassName}>
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </Card>
      {aside}
    </section>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[28px] border border-white/10 bg-[#10141d]/88 p-6 shadow-[0_24px_80px_rgba(6,10,20,0.45)] backdrop-blur-xl ${className ?? ''}`}>{children}</section>
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      {description ? <p className="text-sm leading-6 text-slate-400">{description}</p> : null}
    </div>
  )
}

export function StatCard({ label, value, note, tone = 'slate' }: { label: string; value: string; note: string; tone?: Tone }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</p>
          <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
        </div>
        <TonePill tone={tone}>{label}</TonePill>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{note}</p>
    </Card>
  )
}

export function TonePill({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${toneMap[tone]}`}>{children}</span>
}

export function DataRow({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: string
  tone?: Tone
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <TonePill tone={tone}>{value}</TonePill>
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-white/10">
      <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-emerald-400" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function EmptyNotice({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="border-dashed">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  )
}
