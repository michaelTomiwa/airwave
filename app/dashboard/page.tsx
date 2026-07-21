import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Radio } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Card, DataRow, EmptyNotice, PageContainer, PageFrame, PageHeader, SectionTitle, StatCard, buttonClassName } from '@/components/AppUi'
import { StationCard } from '@/components/StationCard'
import { formatKobo, formatRelativeTime } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role === 'ADMIN') redirect('/admin')

  if (session.user.role === 'BROADCASTER') {
    const station = await prisma.station.findUnique({
      where: { ownerId: session.user.id },
      include: { subscription: { include: { plan: true } }, liveSessions: { where: { status: 'LIVE' }, take: 1 } },
    })
    const payments = await prisma.payment.findMany({
      where: { stationId: station?.id, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })

    return (
      <PageFrame>
        <PageContainer>
          <PageHeader
            eyebrow="Broadcaster dashboard"
            title={`Welcome back, ${session.user.name}`}
            description={station ? `${station.name} is ${station.isLive ? 'live right now' : 'currently offline'}.` : 'Set up your station to get started.'}
            actions={[{ label: 'Open studio', href: '/studio' }]}
          />

          {station ? (
            <>
              <section className="mt-8 grid gap-5 sm:grid-cols-3">
                <StatCard label="Wallet" value={formatKobo(station.walletBalanceKobo)} note="Total earned to date." tone="emerald" />
                <StatCard label="Followers" value={station.followerCount.toLocaleString('en-NG')} note="People following your station." tone="violet" />
                <StatCard label="Plan" value={station.subscription?.plan.name ?? 'Starter'} note="Current subscription tier." tone="cyan" />
              </section>

              <section className="mt-8">
                <Card>
                  <SectionTitle title="Recent payments" description="Tips and supporter subscriptions received." />
                  <div className="mt-5 space-y-2">
                    {payments.length === 0 ? (
                      <p className="text-sm text-slate-500">No payments yet.</p>
                    ) : (
                      payments.map((p) => (
                        <DataRow key={p.id} label={`${p.purpose === 'TIP' ? 'Tip' : 'Support'} — ${formatRelativeTime(p.createdAt)}`} value={formatKobo(p.amountKobo)} tone="emerald" />
                      ))
                    )}
                  </div>
                </Card>
              </section>
            </>
          ) : (
            <EmptyNotice title="No station yet" description="Something went wrong setting up your station. Contact support." />
          )}
        </PageContainer>
      </PageFrame>
    )
  }

  const [follows, saved, payments] = await Promise.all([
    prisma.follow.findMany({
      where: { userId: session.user.id },
      include: { station: { include: { owner: { select: { name: true } }, liveSessions: { where: { status: 'LIVE' }, take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.savedStation.count({ where: { userId: session.user.id } }),
    prisma.payment.findMany({ where: { userId: session.user.id, status: 'SUCCESS' }, orderBy: { createdAt: 'desc' }, take: 8 }),
  ])

  return (
    <PageFrame>
      <PageContainer>
        <PageHeader
          eyebrow="Your dashboard"
          title={`Welcome back, ${session.user.name}`}
          description="Everything you follow and support, in one place."
          actions={[{ label: 'Discover stations', href: '/discover' }]}
        />

        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <StatCard label="Following" value={String(follows.length)} note="Stations you follow." tone="violet" />
          <StatCard label="Saved" value={String(saved)} note="Stations you've bookmarked." tone="cyan" />
        </section>

        <section className="mt-8">
          <SectionTitle title="Stations you follow" />
          {follows.length === 0 ? (
            <div className="mt-4">
              <EmptyNotice
                title="You're not following anyone yet"
                description="Discover live stations and follow the ones you love to see them here."
                action={
                  <Link href="/discover" className={buttonClassName}>
                    <Radio className="mr-2 h-4 w-4" /> Browse stations
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {follows.map((f) => (
                <StationCard
                  key={f.stationId}
                  station={{
                    slug: f.station.slug,
                    name: f.station.name,
                    category: f.station.category,
                    description: f.station.description,
                    isLive: f.station.isLive,
                    featured: f.station.featured,
                    verified: f.station.verified,
                    followerCount: f.station.followerCount,
                    currentListeners: f.station.liveSessions[0]?.currentListeners ?? 0,
                    hostName: f.station.owner.name,
                    nowPlayingTitle: f.station.nowPlayingTitle,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <Card>
            <SectionTitle title="Your support history" description="Tips and supporter subscriptions you've sent." />
            <div className="mt-5 space-y-2">
              {payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments yet. Support a station from its profile page.</p>
              ) : (
                payments.map((p) => (
                  <DataRow key={p.id} label={`${p.purpose === 'TIP' ? 'Tip sent' : 'Supporter payment'} — ${formatRelativeTime(p.createdAt)}`} value={formatKobo(p.amountKobo)} tone="violet" />
                ))
              )}
            </div>
          </Card>
        </section>
      </PageContainer>
    </PageFrame>
  )
}
