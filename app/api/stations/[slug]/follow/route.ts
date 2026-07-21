import { prisma } from '@/lib/db'
import { requireSession, jsonError, jsonOk } from '@/lib/api-guard'

export async function POST(_request: Request, { params }: { params: { slug: string } }) {
  const { session, error } = await requireSession()
  if (error) return error

  const station = await prisma.station.findUnique({ where: { slug: params.slug } })
  if (!station) return jsonError('Station not found.', 404)

  const existing = await prisma.follow.findUnique({
    where: { userId_stationId: { userId: session.user.id, stationId: station.id } },
  })

  if (existing) {
    await prisma.$transaction([
      prisma.follow.delete({ where: { id: existing.id } }),
      prisma.station.update({ where: { id: station.id }, data: { followerCount: { decrement: 1 } } }),
    ])
    return jsonOk({ following: false })
  }

  await prisma.$transaction([
    prisma.follow.create({ data: { userId: session.user.id, stationId: station.id } }),
    prisma.station.update({ where: { id: station.id }, data: { followerCount: { increment: 1 } } }),
    prisma.notification.create({
      data: {
        userId: station.ownerId,
        type: 'NEW_FOLLOWER',
        title: 'New follower',
        body: `${session.user.name} started following ${station.name}.`,
        linkUrl: `/dashboard`,
      },
    }),
  ])

  return jsonOk({ following: true })
}
