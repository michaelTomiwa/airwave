'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Heart } from 'lucide-react'
import { Card, secondaryButtonClassName } from './AppUi'
import { supporterTierCatalog } from '@/lib/constants'
import { formatKobo } from '@/lib/format'
import { poster } from '@/lib/fetcher'

export function SupportTierPicker({ stationSlug, stationName }: { stationSlug: string; stationName: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  async function support(tier: string) {
    if (!session?.user) {
      toast.info('Log in to support this station.')
      router.push('/auth/login')
      return
    }
    setLoadingTier(tier)
    try {
      const data = await poster<{ authorizationUrl: string }>('/api/payments/support', { stationSlug, tier })
      window.location.href = data.authorizationUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start payment.')
    } finally {
      setLoadingTier(null)
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-fuchsia-300" />
        <h3 className="text-lg font-semibold text-white">Become a supporter</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-400">Support {stationName} monthly and unlock supporter perks.</p>
      <div className="mt-5 space-y-3">
        {supporterTierCatalog.map((tier) => (
          <div key={tier.tier} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">{tier.name}</p>
              <p className="text-sm text-fuchsia-300">{formatKobo(tier.priceKobo)}/mo</p>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {tier.perks.map((perk) => (
                <li key={perk}>• {perk}</li>
              ))}
            </ul>
            <button
              onClick={() => support(tier.tier)}
              disabled={loadingTier === tier.tier}
              className={`${secondaryButtonClassName} mt-3 w-full`}
            >
              {loadingTier === tier.tier ? 'Redirecting…' : `Become a ${tier.name}`}
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}
