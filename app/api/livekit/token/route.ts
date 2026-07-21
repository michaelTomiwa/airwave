import { NextRequest } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { jsonError, jsonOk } from '@/lib/api-guard'
import { mintToken, roomNameForStation } from '@/lib/livekit'

const schema = z.object({
  stationSlug: z.string(),
  mode: z.enum(['publish', 'subscribe']),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError('Invalid token request.')

  const station = await prisma.station.findUnique({ where: { slug: parsed.data.stationSlug } })
  if (!station) return jsonError('Station not found.', 404)

  const session = await auth()
  const room = roomNameForStation(station.id)

  if (parsed.data.mode === 'publish') {
    if (!session?.user || session.user.role !== 'BROADCASTER' || session.user.stationId !== station.id) {
      return jsonError('Only this station\'s broadcaster can publish.', 403)
    }
    const token = await mintToken({ identity: session.user.id, name: session.user.name ?? 'Broadcaster', room, canPublish: true })
    return jsonOk({ token, room, wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL })
  }

  const identity = session?.user?.id ?? `guest-${randomUUID().slice(0, 10)}`
  const name = session?.user?.name ?? 'Listener'
  const token = await mintToken({ identity, name, room, canPublish: false })
  return jsonOk({ token, room, wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL })
}
