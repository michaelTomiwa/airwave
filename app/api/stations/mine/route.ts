import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'

export async function GET() {
  const { session, error } = await requireRole(['BROADCASTER'])
  if (error) return error

  const station = await prisma.station.findUnique({
    where: { ownerId: session.user.id },
    include: {
      subscription: { include: { plan: true } },
      liveSessions: { where: { status: 'LIVE' }, take: 1 },
      _count: { select: { follows: true, recordings: true } },
    },
  })

  if (!station) return jsonError('No station found for this account.', 404)

  return jsonOk(station)
}
