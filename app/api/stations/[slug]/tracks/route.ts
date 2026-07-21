import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { jsonError, jsonOk } from '@/lib/api-guard'

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  const station = await prisma.station.findUnique({ where: { slug: params.slug }, select: { id: true } })
  if (!station) return jsonError('Station not found.', 404)

  const tracks = await prisma.track.findMany({ where: { stationId: station.id }, orderBy: { createdAt: 'desc' } })
  return jsonOk(tracks)
}

const trackSchema = z.object({
  title: z.string().min(1).max(120),
  artist: z.string().min(1).max(120),
  durationSeconds: z.number().int().positive().max(36000),
})

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BROADCASTER') return jsonError('You do not have access to do this.', 403)

  const station = await prisma.station.findUnique({ where: { slug: params.slug } })
  if (!station || station.ownerId !== session.user.id) return jsonError('Station not found.', 404)

  const body = await request.json().catch(() => null)
  const parsed = trackSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid track.')

  const track = await prisma.track.create({ data: { stationId: station.id, ...parsed.data } })
  return jsonOk(track, 201)
}
