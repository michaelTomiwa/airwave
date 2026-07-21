import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BadgeCheck, Calendar, Disc3, Radio } from 'lucide-react'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { Card, PageContainer, PageFrame, PageHeader, SectionTitle, TonePill, EmptyNotice, buttonClassName } from '@/components/AppUi'
import { FollowSaveButtons } from '@/components/FollowSaveButtons'
import { TipButton } from '@/components/TipButton'
import { SupportTierPicker } from '@/components/SupportTierPicker'
import { formatDuration, formatCompactNumber } from '@/lib/format'
import { withPlayableUrls } from '@/lib/recordings'

export const dynamic = 'force-dynamic'

export default async function StationProfilePage({ params }: { params: { slug: string } }) {
  const stationRaw = await prisma.station.findUnique({
    where: { slug: params.slug },
    include: {
      owner: { select: { name: true, username: true } },
      tracks: { orderBy: { createdAt: 'desc' }, take: 10 },
      scheduledShows: { where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 5 },
      recordings: { where: { status: 'READY' }, orderBy: { airedAt: 'desc' }, take: 6 },
      _count: { select: { follows: true } },
    },
  })

  if (!stationRaw || stationRaw.approvalStatus !== 'APPROVED') notFound()

  const station = { ...stationRaw, recordings: await withPlayableUrls(stationRaw.recordings) }

  const session = await auth()
  let isFollowing = false
  let isSaved = false
  if (session?.user) {
    const [follow, saved] = await Promise.all([
      prisma.follow.findUnique({ where: { userId_stationId: { userId: session.user.id, stationId: station.id } } }),
      prisma.savedStation.findUnique({ where: { userId_stationId: { userId: session.user.id, stationId: station.id } } }),
    ])
    isFollowing = !!follow
    isSaved = !!saved
  }

  const leaderboard = await prisma.payment.groupBy({
    by: ['userId'],
    where: { stationId: station.id, status: 'SUCCESS', purpose: { in: ['TIP', 'LISTENER_SUPPORT'] } },
    _sum: { amountKobo: true },
    orderBy: { _sum: { amountKobo: 'desc' } },
    take: 5,
  })
  const leaderUsers = await prisma.user.findMany({ where: { id: { in: leaderboard.map((l) => l.userId) } }, select: { id: true, name: true } })
  const leaderMap = new Map(leaderUsers.map((u) => [u.id, u.name]))

  return (
    <PageFrame>
      <PageContainer>
        <PageHeader
          eyebrow={station.category}
          title={station.name}
          description={station.description}
          aside={
            <Card>
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-cyan-500/20 text-lg font-bold text-white">
                  {station.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-white">
                    {station.name}
                    {station.verified ? <BadgeCheck className="h-4 w-4 text-cyan-300" /> : null}
                  </p>
                  <p className="text-xs text-slate-400">hosted by {station.owner.name}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {station.isLive ? <TonePill tone="rose">Live now</TonePill> : <TonePill tone="slate">Offline</TonePill>}
                <TonePill tone="violet">{formatCompactNumber(station._count.follows)} followers</TonePill>
                <TonePill tone="cyan">{station.language}</TonePill>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <Link href={`/r/${station.slug}`} className={buttonClassName}>
                  <Radio className="mr-2 h-4 w-4" /> {station.isLive ? 'Listen live' : 'View live room'}
                </Link>
                <FollowSaveButtons stationSlug={station.slug} initialFollowing={isFollowing} initialSaved={isSaved} />
              </div>
            </Card>
          }
        />

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <Card>
              <SectionTitle title="Recent tracks" description="What's been playing on this station." />
              <div className="mt-4 space-y-2">
                {station.tracks.length === 0 ? (
                  <p className="text-sm text-slate-500">No tracks logged yet.</p>
                ) : (
                  station.tracks.map((track) => (
                    <div key={track.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Disc3 className="h-4 w-4 text-fuchsia-300" />
                        <div>
                          <p className="text-sm text-white">{track.title}</p>
                          <p className="text-xs text-slate-500">{track.artist}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{formatDuration(track.durationSeconds)}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <SectionTitle title="Recordings" description="Catch up on past broadcasts." />
              <div className="mt-4 space-y-2">
                {station.recordings.length === 0 ? (
                  <p className="text-sm text-slate-500">No recordings available yet.</p>
                ) : (
                  station.recordings.map((recording) => (
                    <div key={recording.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white">{recording.title}</p>
                        <span className="text-xs text-slate-500">{formatDuration(recording.durationSeconds)}</span>
                      </div>
                      {recording.fileUrl ? (
                        <audio controls className="mt-2 w-full" src={recording.fileUrl} />
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">Processing…</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {station.scheduledShows.length > 0 ? (
              <Card>
                <SectionTitle title="Upcoming shows" />
                <div className="mt-4 space-y-2">
                  {station.scheduledShows.map((show) => (
                    <div key={show.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-cyan-300" />
                        <p className="text-sm text-white">{show.title}</p>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(show.startsAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <TipButton stationSlug={station.slug} stationName={station.name} />
            <SupportTierPicker stationSlug={station.slug} stationName={station.name} />
            <Card>
              <SectionTitle title="Top supporters" />
              <div className="mt-4 space-y-2">
                {leaderboard.length === 0 ? (
                  <EmptyNotice title="No supporters yet" description="Be the first to tip or support this station." />
                ) : (
                  leaderboard.map((entry, index) => (
                    <div key={entry.userId} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-sm text-slate-200">
                        #{index + 1} {leaderMap.get(entry.userId) ?? 'Listener'}
                      </span>
                      <span className="text-sm text-fuchsia-300">₦{((entry._sum.amountKobo ?? 0) / 100).toLocaleString('en-NG')}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </section>
      </PageContainer>
    </PageFrame>
  )
}
