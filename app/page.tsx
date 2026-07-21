import Link from 'next/link'
import { ArrowRight, BadgeCheck, Gift, HandCoins, Mic2, Radio, ShieldCheck, Users, Zap } from 'lucide-react'
import { prisma } from '@/lib/db'
import { Card, PageContainer, PageFrame, SectionTitle, TonePill, buttonClassName, secondaryButtonClassName } from '@/components/AppUi'
import { StationCard } from '@/components/StationCard'
import { formatCompactNumber, formatKobo } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const [liveStations, plans, liveCount, listenerAgg, stationCount] = await Promise.all([
    prisma.station.findMany({
      where: { approvalStatus: 'APPROVED', isLive: true },
      include: { owner: { select: { name: true } }, liveSessions: { where: { status: 'LIVE' }, take: 1 } },
      orderBy: { followerCount: 'desc' },
      take: 6,
    }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 3 }),
    prisma.station.count({ where: { isLive: true } }),
    prisma.liveSession.aggregate({ where: { status: 'LIVE' }, _sum: { currentListeners: true } }),
    prisma.station.count({ where: { approvalStatus: 'APPROVED' } }),
  ])

  return (
    <PageFrame>
      <PageContainer>
        <section className="grid gap-8 pt-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-fuchsia-200">
              <Zap className="h-3.5 w-3.5" /> Live internet radio, reimagined
            </span>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-tight text-white sm:text-6xl">
              Broadcast Beyond <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">Limits</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              AIRWAVE is the easiest way to go live to the world — real WebRTC broadcasting straight from your browser, live chat, real recordings, and real Naira payouts. No downloads, no encoders, no gatekeepers.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/auth/signup" className={buttonClassName}>
                Start broadcasting <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/discover" className={secondaryButtonClassName}>
                <Radio className="mr-2 h-4 w-4" /> Listen live now
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4">
              <Stat label="Live now" value={String(liveCount)} />
              <Stat label="Listening now" value={formatCompactNumber(listenerAgg._sum.currentListeners ?? 0)} />
              <Stat label="Stations" value={formatCompactNumber(stationCount)} />
            </div>
          </div>

          <Card className="bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.18),transparent_40%),linear-gradient(135deg,rgba(13,17,24,0.96),rgba(16,20,31,0.92))]">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">On air right now</p>
            <div className="mt-5 space-y-3">
              {liveStations.slice(0, 4).map((s) => (
                <Link key={s.id} href={`/r/${s.slug}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-cyan-500/20 text-sm font-bold text-white">
                      {s.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.category}</p>
                    </div>
                  </div>
                  <TonePill tone="rose">{formatCompactNumber(s.liveSessions[0]?.currentListeners ?? 0)} live</TonePill>
                </Link>
              ))}
              {liveStations.length === 0 ? <p className="text-sm text-slate-500">No stations are live right now — check back soon.</p> : null}
            </div>
          </Card>
        </section>

        <section className="mt-20">
          <SectionTitle title="Everything a modern radio station needs" description="Built for creators who want real infrastructure, not a toy." />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Feature icon={Mic2} title="Real WebRTC broadcasting" desc="Go live straight from your browser with low-latency audio — no software to install." />
            <Feature icon={Users} title="Live chat that scales" desc="Real-time chat with moderation tools, flagging, and instant removal." />
            <Feature icon={HandCoins} title="Naira-first payments" desc="Tips and supporter subscriptions powered by Paystack, priced in ₦." />
            <Feature icon={ShieldCheck} title="Admin-reviewed stations" desc="Every station is approved before going live, keeping the platform clean." />
            <Feature icon={Gift} title="Supporter tiers" desc="Let your biggest fans subscribe monthly for badges and perks — a feature Mixlr never had." />
            <Feature icon={BadgeCheck} title="Verified & featured stations" desc="Build credibility with verification badges and featured placement." />
            <Feature icon={Radio} title="Automatic recordings" desc="Every broadcast can be recorded automatically so listeners can catch up later." />
            <Feature icon={Zap} title="Embeddable player" desc="Drop your live player into any website with one line of HTML." />
          </div>
        </section>

        {liveStations.length > 0 ? (
          <section className="mt-20">
            <SectionTitle title="Live stations" description="Tune in right now." />
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {liveStations.map((s) => (
                <StationCard
                  key={s.id}
                  station={{
                    slug: s.slug,
                    name: s.name,
                    category: s.category,
                    description: s.description,
                    isLive: s.isLive,
                    featured: s.featured,
                    verified: s.verified,
                    followerCount: s.followerCount,
                    currentListeners: s.liveSessions[0]?.currentListeners ?? 0,
                    hostName: s.owner.name,
                    nowPlayingTitle: s.nowPlayingTitle,
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-20">
          <SectionTitle title="Pricing built for Nigerian creators" description="Start free. Upgrade as your audience grows." />
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.code}>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{plan.name}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{plan.priceKobo === 0 ? 'Free' : formatKobo(plan.priceKobo)}</p>
                {plan.priceKobo > 0 ? <p className="text-xs text-slate-500">per month</p> : null}
                <p className="mt-4 text-sm text-slate-400">
                  Up to {plan.listenerCap ? plan.listenerCap.toLocaleString('en-NG') : 'unlimited'} listeners
                </p>
              </Card>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/pricing" className={secondaryButtonClassName}>
              See full pricing <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="my-20">
          <Card className="bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_40%),linear-gradient(135deg,rgba(13,17,24,0.96),rgba(16,20,31,0.92))] text-center">
            <h2 className="text-3xl font-semibold text-white">Ready to go on air?</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">Join AIRWAVE and start broadcasting to a global audience in minutes.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link href="/auth/signup" className={buttonClassName}>
                Create your station <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </Card>
        </section>
      </PageContainer>
    </PageFrame>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
    </div>
  )
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Mic2; title: string; desc: string }) {
  return (
    <Card className="p-5">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
    </Card>
  )
}
