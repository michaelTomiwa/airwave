import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { webhookReceiver } from '@/lib/livekit'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const authHeader = request.headers.get('Authorization')

  let event
  try {
    event = await webhookReceiver.receive(rawBody, authHeader ?? undefined)
  } catch (err) {
    console.error('Invalid LiveKit webhook signature', err)
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const roomName = event.room?.name

  // Listener counts are tracked client-side via /live-status/join and
  // /leave (see StationPlayer) instead of participant_joined/left webhook
  // events — local/dev deployments have no public URL for LiveKit Cloud to
  // reach, and the client heartbeat works identically in every environment.
  // room_finished below stays webhook-driven as a crash safety net: it only
  // fires in deployments where the webhook IS reachable, but when it does
  // fire it correctly recovers from a broadcaster whose browser crashed
  // without calling /api/broadcast/stop.

  if (event.event === 'room_finished' && roomName) {
    const liveSession = await prisma.liveSession.findUnique({ where: { livekitRoomName: roomName } })
    if (liveSession && liveSession.status === 'LIVE') {
      await prisma.$transaction([
        prisma.liveSession.update({ where: { id: liveSession.id }, data: { status: 'ENDED', endedAt: new Date(), currentListeners: 0 } }),
        prisma.station.update({ where: { id: liveSession.stationId }, data: { isLive: false } }),
      ])
    }
  }

  if (event.event === 'egress_ended' && event.egressInfo) {
    const egressId = event.egressInfo.egressId
    const recording = await prisma.recording.findFirst({ where: { egressId } })
    if (recording && recording.status === 'PROCESSING') {
      // fileUrl stores the raw storage object key, not a playable URL —
      // playback routes resolve it to a short-lived signed URL on read
      // (see lib/storage.ts) since the bucket is private.
      const fileResult = event.egressInfo.fileResults?.[0]
      await prisma.recording.update({
        where: { id: recording.id },
        data: {
          status: fileResult ? 'READY' : 'FAILED',
          fileUrl: fileResult?.filename ?? null,
          durationSeconds: fileResult?.duration ? Math.round(Number(fileResult.duration) / 1_000_000_000) : null,
        },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
