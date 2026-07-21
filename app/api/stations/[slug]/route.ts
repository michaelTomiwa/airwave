import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { jsonError, jsonOk } from '@/lib/api-guard'

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const station = await prisma.station.findUnique({
    where: { slug: params.slug },
    include: {
      owner: { select: { name: true, username: true } },
      subscription: { include: { plan: true } },
      liveSessions: { where: { status: 'LIVE' }, take: 1 },
      tracks: { orderBy: { createdAt: 'desc' }, take: 25 },
      scheduledShows: { where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 10 },
      _count: { select: { follows: true } },
    },
  })

  if (!station || station.approvalStatus !== 'APPROVED') {
    return jsonError('Station not found.', 404)
  }

  const session = await auth()
  let isFollowing = false
  let isSaved = false
  if (session?.user) {
    const [follow, saved] = await Promise.all([
      prisma.follow.findUnique({ where: { userId_stationId: { userId: session.user.id, stationId: station.id } } }),
      prisma.savedStation.findUnique({ where: { userId_stationId: { userId: session.user.id, stationId: station.id } } }),
    ])
    isFollowing = !!follow
    isSaved = !!saved
  }

  return jsonOk({ ...station, isFollowing, isSaved })
}

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  category: z.string().min(2).optional(),
  description: z.string().min(10).max(600).optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  nowPlayingTitle: z.string().max(120).optional().nullable(),
})

export async function PATCH(request: NextRequest, { params }: { params: { slug: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BROADCASTER') {
    return jsonError('You do not have access to do this.', 403)
  }

  const station = await prisma.station.findUnique({ where: { slug: params.slug } })
  if (!station || station.ownerId !== session.user.id) {
    return jsonError('Station not found.', 404)
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid update.')

  const updated = await prisma.station.update({
    where: { id: station.id },
    data: parsed.data,
  })

  return jsonOk(updated)
}
