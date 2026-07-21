import { prisma } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/api-guard'

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const station = await prisma.station.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      isLive: true,
      liveSessions: {
        where: { status: 'LIVE' },
        take: 1,
        select: { id: true, livekitRoomName: true, currentListeners: true, startedAt: true },
      },
    },
  })
  if (!station) return jsonError('Station not found.', 404)

  const session = station.liveSessions[0]
  return jsonOk({
    isLive: station.isLive && !!session,
    liveSessionId: session?.id ?? null,
    roomName: session?.livekitRoomName ?? null,
    currentListeners: session?.currentListeners ?? 0,
    startedAt: session?.startedAt ?? null,
  })
}
