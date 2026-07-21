import { prisma } from '@/lib/db'
import { requireRole, jsonOk } from '@/lib/api-guard'

export async function GET() {
  const { error } = await requireRole(['ADMIN'])
  if (error) return error

  const [liveStations, totalStations, pendingStations, pendingPayouts, openReports, totalListenersAgg, users, activities] = await Promise.all([
    prisma.station.count({ where: { isLive: true, approvalStatus: 'APPROVED' } }),
    prisma.station.count(),
    prisma.station.count({ where: { approvalStatus: 'PENDING' } }),
    prisma.payout.count({ where: { status: 'PENDING' } }),
    prisma.report.count({ where: { status: 'OPEN' } }),
    prisma.liveSession.aggregate({ where: { status: 'LIVE' }, _sum: { currentListeners: true } }),
    prisma.user.count(),
    prisma.activity.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
  ])

  return jsonOk({
    liveStations,
    totalStations,
    pendingStations,
    pendingPayouts,
    openReports,
    totalListeners: totalListenersAgg._sum.currentListeners ?? 0,
    users,
    activities,
  })
}
