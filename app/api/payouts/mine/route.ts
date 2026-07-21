import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'

export async function GET() {
  const { session, error } = await requireRole(['BROADCASTER'])
  if (error) return error

  const station = await prisma.station.findUnique({ where: { ownerId: session.user.id } })
  if (!station) return jsonError('No station found for this account.', 404)

  const payouts = await prisma.payout.findMany({ where: { stationId: station.id }, orderBy: { requestedAt: 'desc' } })
  return jsonOk(payouts)
}
