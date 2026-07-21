import Link from 'next/link'
import { Check } from 'lucide-react'
import { prisma } from '@/lib/db'
import { Card, PageContainer, PageFrame, PageHeader, SectionTitle, buttonClassName, secondaryButtonClassName } from '@/components/AppUi'
import { formatKobo } from '@/lib/format'
import { supporterTierCatalog } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })

  return (
    <PageFrame>
      <PageContainer>
        <PageHeader
          eyebrow="Pricing"
          title="Simple pricing in Naira. No surprises."
          description="Start free as a broadcaster, upgrade as your audience grows. Listeners can support their favorite stations directly."
        />

        <section className="mt-10">
          <SectionTitle title="For broadcasters" description="Every plan includes unlimited live broadcasting hours and live chat." />
          <div className="mt-5 grid gap-5 lg:grid-cols-5">
            {plans.map((plan) => (
              <Card key={plan.code} className={plan.code === 'PRO' ? 'border-fuchsia-400/40 shadow-glow' : undefined}>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{plan.name}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{plan.priceKobo === 0 ? 'Free' : formatKobo(plan.priceKobo)}</p>
                {plan.priceKobo > 0 ? <p className="text-xs text-slate-500">per month</p> : null}
                <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
                  <Feature label={`${plan.listenerCap ? plan.listenerCap.toLocaleString('en-NG') : 'Unlimited'} listeners`} />
                  <Feature label={`${plan.maxGuests} guest host${plan.maxGuests === 1 ? '' : 's'}`} />
                  <Feature label={plan.recordingEnabled ? 'Broadcast recording' : 'No recording'} muted={!plan.recordingEnabled} />
                  <Feature label={plan.customBranding ? 'Custom branding + embed widget' : 'Standard branding'} muted={!plan.customBranding} />
                  <Feature label={plan.analytics ? 'Advanced analytics' : 'Basic analytics'} muted={!plan.analytics} />
                </ul>
                <Link href="/auth/signup" className={`${plan.code === 'PRO' ? buttonClassName : secondaryButtonClassName} mt-6 w-full`}>
                  Get started
                </Link>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionTitle title="For listeners" description="Support the stations you love with a monthly subscription — perks included." />
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {supporterTierCatalog.map((tier) => (
              <Card key={tier.tier}>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{tier.name}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatKobo(tier.priceKobo)}</p>
                <p className="text-xs text-slate-500">per station, per month</p>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
                  {tier.perks.map((perk) => (
                    <Feature key={perk} label={perk} />
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">Visit any station's profile to become a supporter, or send a one-off tip starting at ₦100.</p>
        </section>
      </PageContainer>
    </PageFrame>
  )
}

function Feature({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${muted ? 'text-slate-500' : ''}`}>
      <Check className={`h-4 w-4 shrink-0 ${muted ? 'text-slate-600' : 'text-emerald-400'}`} />
      {label}
    </li>
  )
}
