import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireSession, jsonError, jsonOk } from '@/lib/api-guard'
import { initializeTransaction } from '@/lib/paystack'
import { MIN_TIP_KOBO } from '@/lib/constants'

const schema = z.object({
  stationSlug: z.string(),
  amountKobo: z.number().int().min(MIN_TIP_KOBO),
})

export async function POST(request: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError(`Minimum tip is NGN ${MIN_TIP_KOBO / 100}.`)

  const station = await prisma.station.findUnique({ where: { slug: parsed.data.stationSlug } })
  if (!station) return jsonError('Station not found.', 404)

  const reference = `tip_${randomUUID()}`
  const payment = await prisma.payment.create({
    data: {
      purpose: 'TIP',
      userId: session.user.id,
      stationId: station.id,
      amountKobo: parsed.data.amountKobo,
      status: 'PENDING',
      paystackReference: reference,
    },
  })

  try {
    const init = await initializeTransaction({
      email: session.user.email ?? `${session.user.id}@airwave.fm`,
      amountKobo: parsed.data.amountKobo,
      reference,
      callbackUrl: `${process.env.APP_URL}/payments/callback`,
      metadata: { purpose: 'TIP', paymentId: payment.id, stationSlug: station.slug },
    })
    return jsonOk({ authorizationUrl: init.data.authorization_url, reference })
  } catch (err) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return jsonError(err instanceof Error ? err.message : 'Could not start payment.', 502)
  }
}
