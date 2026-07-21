import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireSession, jsonError, jsonOk } from '@/lib/api-guard'
import { initializeTransaction } from '@/lib/paystack'
import { supporterTierCatalog } from '@/lib/constants'

const schema = z.object({
  stationSlug: z.string(),
  tier: z.enum(['FAN', 'SUPERFAN', 'VIP']),
})

export async function POST(request: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError('Invalid supporter tier.')

  const station = await prisma.station.findUnique({ where: { slug: parsed.data.stationSlug } })
  if (!station) return jsonError('Station not found.', 404)

  const tierInfo = supporterTierCatalog.find((t) => t.tier === parsed.data.tier)!

  const reference = `sup_${randomUUID()}`
  const payment = await prisma.payment.create({
    data: {
      purpose: 'LISTENER_SUPPORT',
      userId: session.user.id,
      stationId: station.id,
      amountKobo: tierInfo.priceKobo,
      status: 'PENDING',
      paystackReference: reference,
      metadata: JSON.stringify({ tier: parsed.data.tier }),
    },
  })

  try {
    const init = await initializeTransaction({
      email: session.user.email ?? `${session.user.id}@airwave.fm`,
      amountKobo: tierInfo.priceKobo,
      reference,
      callbackUrl: `${process.env.APP_URL}/payments/callback`,
      metadata: { purpose: 'LISTENER_SUPPORT', paymentId: payment.id, stationSlug: station.slug },
    })
    return jsonOk({ authorizationUrl: init.data.authorization_url, reference })
  } catch (err) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return jsonError(err instanceof Error ? err.message : 'Could not start payment.', 502)
  }
}
