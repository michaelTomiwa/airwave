import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(['ADMIN'])
  if (error) return error

  const payout = await prisma.payout.findUnique({ where: { id: params.id }, include: { station: true } })
  if (!payout) return jsonError('Payout not found.', 404)

  const updated = await prisma.payout.update({
    where: { id: params.id },
    data: { status: 'REJECTED', decidedByAdminId: session.user.id, decidedAt: new Date() },
  })

  await prisma.station.update({
    where: { id: payout.stationId },
    data: { pendingPayoutKobo: { increment: payout.amountKobo } },
  })

  await prisma.notification.create({
    data: {
      userId: payout.station.ownerId,
      type: 'PAYOUT_DECIDED',
      title: 'Payout rejected',
      body: `Your payout request of NGN ${(payout.amountKobo / 100).toLocaleString('en-NG')} was rejected. Funds have been returned to your pending balance.`,
      linkUrl: '/dashboard',
    },
  })

  return jsonOk(updated)
}
