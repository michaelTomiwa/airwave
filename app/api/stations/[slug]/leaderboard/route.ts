import { prisma } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/api-guard'

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const station = await prisma.station.findUnique({ where: { slug: params.slug }, select: { id: true } })
  if (!station) return jsonError('Station not found.', 404)

  const grouped = await prisma.payment.groupBy({
    by: ['userId'],
    where: { stationId: station.id, status: 'SUCCESS', purpose: { in: ['TIP', 'LISTENER_SUPPORT'] } },
    _sum: { amountKobo: true },
    orderBy: { _sum: { amountKobo: 'desc' } },
    take: 10,
  })

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true, username: true, avatarUrl: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  const supports = await prisma.stationSupport.findMany({
    where: { stationId: station.id, status: 'ACTIVE', listenerId: { in: grouped.map((g) => g.userId) } },
    select: { listenerId: true, tier: true },
  })
  const tierMap = new Map(supports.map((s) => [s.listenerId, s.tier]))

  return jsonOk(
    grouped
      .filter((g) => userMap.has(g.userId))
      .map((g) => ({
        user: userMap.get(g.userId),
        totalKobo: g._sum.amountKobo ?? 0,
        tier: tierMap.get(g.userId) ?? null,
      })),
  )
}
