'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Search } from 'lucide-react'
import { PageContainer, PageFrame, PageHeader, EmptyNotice, inputClassName, secondaryButtonClassName, buttonClassName } from '@/components/AppUi'
import { StationCard, type StationCardData } from '@/components/StationCard'
import { fetcher } from '@/lib/fetcher'
import { categories } from '@/lib/constants'

export default function DiscoverPage() {
  const [category, setCategory] = useState('All')
  const [liveOnly, setLiveOnly] = useState(false)
  const [search, setSearch] = useState('')

  const params = new URLSearchParams()
  if (category !== 'All') params.set('category', category)
  if (liveOnly) params.set('live', 'true')
  if (search.trim()) params.set('search', search.trim())

  const { data: stations, isLoading } = useSWR<StationCardData[]>(`/api/stations?${params.toString()}`, fetcher, {
    refreshInterval: 8000,
  })

  return (
    <PageFrame>
      <PageContainer>
        <PageHeader
          eyebrow="Discover"
          title="Find your next favorite station."
          description="Browse live broadcasts and creator-run stations across every genre. Follow the ones you love and never miss a set."
        />

        <section className="mt-8 flex flex-col gap-4 rounded-[24px] border border-white/10 bg-[#10141d]/70 p-5 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stations, hosts, genres…"
              className={`${inputClassName} pl-11`}
            />
          </div>
          <button onClick={() => setLiveOnly((v) => !v)} className={liveOnly ? buttonClassName : secondaryButtonClassName}>
            {liveOnly ? 'Showing live only' : 'Show live only'}
          </button>
        </section>

        <div className="mt-5 flex flex-wrap gap-2">
          {['All', ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                category === c ? 'border-fuchsia-400/30 bg-fuchsia-500/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <section className="mt-8">
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading stations…</p>
          ) : !stations || stations.length === 0 ? (
            <EmptyNotice title="No stations match yet" description="Try a different category or search term, or check back soon — new stations are approved regularly." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {stations.map((station) => (
                <StationCard key={station.slug} station={station} />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </PageFrame>
  )
}
