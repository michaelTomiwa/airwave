import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'
import { initializeTransaction } from '@/lib/paystack'

const schema = z.object({ planCode: z.string() })

export async function POST(request: NextRequest) {
  const { session, error } = await requireRole(['BROADCASTER'])
  if (error) return error

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError('Invalid plan selection.')

  const [station, plan] = await Promise.all([
    prisma.station.findUnique({ where: { ownerId: session.user.id } }),
    prisma.plan.findUnique({ where: { code: parsed.data.planCode } }),
  ])
  if (!station) return jsonError('No station found for this account.', 404)
  if (!plan || !plan.isActive) return jsonError('Plan not found.', 404)

  if (plan.priceKobo === 0) {
    await prisma.broadcasterSubscription.upsert({
      where: { stationId: station.id },
      update: { planId: plan.id, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 100 * 365 * 86400000) },
      create: { stationId: station.id, planId: plan.id, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 100 * 365 * 86400000) },
    })
    return jsonOk({ free: true })
  }

  const reference = `sub_${randomUUID()}`
  const payment = await prisma.payment.create({
    data: {
      purpose: 'BROADCASTER_SUBSCRIPTION',
      userId: session.user.id,
      stationId: station.id,
      amountKobo: plan.priceKobo,
      status: 'PENDING',
      paystackReference: reference,
      metadata: JSON.stringify({ planId: plan.id }),
    },
  })

  try {
    const init = await initializeTransaction({
      email: session.user.email ?? `${session.user.id}@airwave.fm`,
      amountKobo: plan.priceKobo,
      reference,
      callbackUrl: `${process.env.APP_URL}/payments/callback`,
      metadata: { purpose: 'BROADCASTER_SUBSCRIPTION', paymentId: payment.id },
    })
    return jsonOk({ authorizationUrl: init.data.authorization_url, reference })
  } catch (err) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return jsonError(err instanceof Error ? err.message : 'Could not start payment.', 502)
  }
}
