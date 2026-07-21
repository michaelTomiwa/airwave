import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'
import { egressClient, pollEgressCompletion } from '@/lib/livekit'

export async function POST() {
  const { session, error } = await requireRole(['BROADCASTER'])
  if (error) return error

  const station = await prisma.station.findUnique({ where: { ownerId: session.user.id } })
  if (!station) return jsonError('No station found for this account.', 404)

  const liveSession = await prisma.liveSession.findFirst({
    where: { stationId: station.id, status: 'LIVE' },
    include: { recording: true },
  })

  await prisma.station.update({ where: { id: station.id }, data: { isLive: false } })

  if (liveSession) {
    await prisma.liveSession.update({
      where: { id: liveSession.id },
      data: { status: 'ENDED', endedAt: new Date() },
    })

    if (liveSession.recording?.egressId) {
      try {
        await egressClient.stopEgress(liveSession.recording.egressId)
        // Not awaited: egress takes time to finish uploading after being
        // told to stop, and the broadcaster shouldn't wait on that.
        pollEgressCompletion(liveSession.recording.egressId, liveSession.recording.id).catch(() => {})
      } catch (err) {
        console.error('Failed to stop egress', err)
      }
    }
  }

  await prisma.activity.create({
    data: { title: `${station.name} ended broadcast`, detail: `${station.name} went offline.`, tone: 'NEUTRAL' },
  })

  return jsonOk({ ended: true })
}
