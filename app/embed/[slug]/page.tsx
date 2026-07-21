'use client'

import useSWR from 'swr'
import { StationPlayer } from '@/components/StationPlayer'
import { fetcher } from '@/lib/fetcher'
import { productIdentity } from '@/lib/constants'

type StationDetail = { name: string }

export default function EmbedPlayerPage({ params }: { params: { slug: string } }) {
  const { data: station } = useSWR<StationDetail>(`/api/stations/${params.slug}`, fetcher)

  return (
    <div className="min-h-screen bg-[#050811] p-3">
      <StationPlayer stationSlug={params.slug} stationName={station?.name ?? 'AIRWAVE station'} />
      <a href={`https://airwave.fm/station/${params.slug}`} target="_blank" rel="noreferrer" className="mt-2 block text-center text-[10px] uppercase tracking-[0.2em] text-slate-600">
        Powered by {productIdentity.name}
      </a>
    </div>
  )
}
