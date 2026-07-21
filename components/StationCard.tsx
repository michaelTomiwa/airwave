import Link from 'next/link'
import { Radio, Users, BadgeCheck, Star } from 'lucide-react'
import { formatCompactNumber } from '@/lib/format'

export type StationCardData = {
  slug: string
  name: string
  category: string
  description: string
  isLive: boolean
  featured: boolean
  verified: boolean
  followerCount: number
  currentListeners: number
  hostName: string
  nowPlayingTitle?: string | null
}

export function StationCard({ station }: { station: StationCardData }) {
  return (
    <Link
      href={`/station/${station.slug}`}
      className="group flex flex-col justify-between rounded-[24px] border border-white/10 bg-[#10141d]/88 p-5 shadow-[0_20px_60px_rgba(6,10,20,0.4)] backdrop-blur-xl transition hover:border-fuchsia-400/30 hover:bg-white/[0.06]"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-cyan-500/20 text-lg font-bold text-white">
            {station.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {station.isLive ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" /> Live
              </span>
            ) : null}
            {station.featured ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                <Star className="h-3 w-3" /> Featured
              </span>
            ) : null}
          </div>
        </div>

        <h3 className="mt-4 flex items-center gap-1.5 text-lg font-semibold text-white">
          {station.name}
          {station.verified ? <BadgeCheck className="h-4 w-4 text-cyan-300" /> : null}
        </h3>
        <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-300">{station.category}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{station.description}</p>
        {station.isLive && station.nowPlayingTitle ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-300">
            <Radio className="h-3.5 w-3.5 text-fuchsia-300" /> {station.nowPlayingTitle}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
        <span>hosted by {station.hostName}</span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {station.isLive ? `${formatCompactNumber(station.currentListeners)} listening` : `${formatCompactNumber(station.followerCount)} followers`}
        </span>
      </div>
    </Link>
  )
}
