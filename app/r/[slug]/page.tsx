'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageContainer, PageFrame, EmptyNotice } from '@/components/AppUi'
import { StationPlayer } from '@/components/StationPlayer'
import { LiveChat } from '@/components/LiveChat'
import { TipButton } from '@/components/TipButton'
import { fetcher } from '@/lib/fetcher'
import { useSession } from 'next-auth/react'

type LiveStatus = { isLive: boolean; liveSessionId: string | null; currentListeners: number }
type StationDetail = { id: string; slug: string; name: string; description: string; ownerId: string }

export default function LiveRoomPage({ params }: { params: { slug: string } }) {
  const { data: session } = useSession()
  const { data: station, error } = useSWR<StationDetail>(`/api/stations/${params.slug}`, fetcher)
  const { data: status } = useSWR<LiveStatus>(`/api/stations/${params.slug}/live-status`, fetcher, { refreshInterval: 5000 })

  if (error) {
    return (
      <PageFrame>
        <PageContainer>
          <EmptyNotice title="Station not found" description="This station may have been removed or is awaiting approval." />
        </PageContainer>
      </PageFrame>
    )
  }

  const canModerate = !!session?.user && (session.user.role === 'ADMIN' || (station && session.user.stationId === station.id))

  return (
    <PageFrame>
      <PageContainer>
        <Link href={`/station/${params.slug}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to station
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <StationPlayer stationSlug={params.slug} stationName={station?.name ?? 'Loading…'} />
            {station ? <TipButton stationSlug={station.slug} stationName={station.name} /> : null}
          </div>
          <div style={{ minHeight: 480 }}>
            <LiveChat stationSlug={params.slug} liveSessionId={status?.liveSessionId ?? null} canModerate={!!canModerate} />
          </div>
        </section>
      </PageContainer>
    </PageFrame>
  )
}
