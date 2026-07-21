import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'

const schema = z.object({
  amountKobo: z.number().int().positive(),
  bankName: z.string().min(2),
  accountNumber: z.string().min(6).max(20),
  accountName: z.string().min(2),
})

export async function POST(request: NextRequest) {
  const { session, error } = await requireRole(['BROADCASTER'])
  if (error) return error

  const station = await prisma.station.findUnique({ where: { ownerId: session.user.id } })
  if (!station) return jsonError('No station found for this account.', 404)

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payout request.')

  if (parsed.data.amountKobo > station.pendingPayoutKobo) {
    return jsonError('You cannot withdraw more than your pending payout balance.')
  }

  const payout = await prisma.payout.create({
    data: { stationId: station.id, ...parsed.data },
  })

  await prisma.station.update({
    where: { id: station.id },
    data: { pendingPayoutKobo: { decrement: parsed.data.amountKobo } },
  })

  await prisma.activity.create({
    data: { title: 'Payout requested', detail: `${station.name} requested a payout of NGN ${(parsed.data.amountKobo / 100).toLocaleString('en-NG')}.`, tone: 'WARNING' },
  })

  return jsonOk(payout, 201)
}
