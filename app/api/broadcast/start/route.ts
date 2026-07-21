import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'
import { roomNameForStation } from '@/lib/livekit'

export async function POST() {
  const { session, error } = await requireRole(['BROADCASTER'])
  if (error) return error

  const station = await prisma.station.findUnique({ where: { ownerId: session.user.id } })
  if (!station) return jsonError('No station found for this account.', 404)
  if (station.approvalStatus !== 'APPROVED') {
    return jsonError('Your station must be approved by an admin before you can go live.', 403)
  }
  if (station.isLive) return jsonError('You are already live.')

  const roomName = `${roomNameForStation(station.id)}-${randomUUID().slice(0, 8)}`

  const liveSession = await prisma.liveSession.create({
    data: { stationId: station.id, livekitRoomName: roomName, status: 'LIVE' },
  })

  await prisma.station.update({ where: { id: station.id }, data: { isLive: true } })

  await prisma.activity.create({
    data: { title: `${station.name} went live`, detail: `${station.name} started a new broadcast.`, tone: 'GOOD' },
  })

  const followers = await prisma.follow.findMany({ where: { stationId: station.id }, select: { userId: true } })
  if (followers.length > 0) {
    await prisma.notification.createMany({
      data: followers.map((f) => ({
        userId: f.userId,
        type: 'STATION_LIVE' as const,
        title: `${station.name} is live`,
        body: `${station.name} just started broadcasting. Tune in now.`,
        linkUrl: `/r/${station.slug}`,
      })),
    })
  }

  // Egress recording is started separately (POST /api/broadcast/start-recording)
  // once the broadcaster's browser has actually joined the LiveKit room —
  // the room doesn't exist on LiveKit's side until a participant joins it,
  // so starting egress here (before the client connects) always fails.
  return jsonOk({ liveSessionId: liveSession.id, roomName })
}
