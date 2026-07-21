import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { jsonError, jsonOk } from '@/lib/api-guard'

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  const station = await prisma.station.findUnique({ where: { slug: params.slug }, select: { id: true } })
  if (!station) return jsonError('Station not found.', 404)

  const shows = await prisma.scheduledShow.findMany({
    where: { stationId: station.id, startsAt: { gte: new Date() } },
    orderBy: { startsAt: 'asc' },
    take: 20,
  })
  return jsonOk(shows)
}

const scheduleSchema = z.object({
  title: z.string().min(2).max(120),
  startsAt: z.string().datetime(),
  recurrence: z.enum(['NONE', 'WEEKLY']).default('NONE'),
})

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BROADCASTER') return jsonError('You do not have access to do this.', 403)

  const station = await prisma.station.findUnique({ where: { slug: params.slug } })
  if (!station || station.ownerId !== session.user.id) return jsonError('Station not found.', 404)

  const body = await request.json().catch(() => null)
  const parsed = scheduleSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid show details.')

  const show = await prisma.scheduledShow.create({
    data: { stationId: station.id, title: parsed.data.title, startsAt: new Date(parsed.data.startsAt), recurrence: parsed.data.recurrence },
  })
  return jsonOk(show, 201)
}
