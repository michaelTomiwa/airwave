import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'
import { startStationEgress, recordingStorageConfigured } from '@/lib/livekit'
import { getStationEntitlements } from '@/lib/entitlements'

// Called by the broadcaster's browser right after it successfully joins the
// LiveKit room (see components studio GoLivePanel). Must happen after the
// room exists on LiveKit's side, not at broadcast/start time.
export async function POST() {
  const { session, error } = await requireRole(['BROADCASTER'])
  if (error) return error

  const station = await prisma.station.findUnique({ where: { ownerId: session.user.id } })
  if (!station) return jsonError('No station found for this account.', 404)

  const liveSession = await prisma.liveSession.findFirst({
    where: { stationId: station.id, status: 'LIVE' },
    include: { recording: true },
  })
  if (!liveSession) return jsonError('No active broadcast found.', 404)
  if (liveSession.recording) return jsonOk({ recordingId: liveSession.recording.id })

  const entitlements = await getStationEntitlements(station.id)
  if (!entitlements.plan?.recordingEnabled) {
    return jsonOk({ recordingId: null, reason: 'Recording is not included in your current plan.' })
  }

  const isLocalLiveKit = (process.env.LIVEKIT_URL ?? '').includes('localhost')
  if (!isLocalLiveKit && !recordingStorageConfigured()) {
    return jsonOk({ recordingId: null, reason: 'Recording storage is not set up yet — you are live, but this broadcast will not be recorded.' })
  }

  try {
    const egress = await startStationEgress(liveSession.livekitRoomName, station.slug)
    const recording = await prisma.recording.create({
      data: {
        stationId: station.id,
        liveSessionId: liveSession.id,
        title: `${station.name} - ${new Date().toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        status: 'PROCESSING',
        egressId: egress.egressId,
      },
    })
    return jsonOk({ recordingId: recording.id })
  } catch (err) {
    console.error('Failed to start egress recording', err)
    return jsonOk({ recordingId: null, reason: 'Could not start recording, but you are still live.' })
  }
}
