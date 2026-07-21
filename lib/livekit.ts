import { AccessToken, EgressClient, RoomServiceClient, WebhookReceiver, EncodedFileType, EncodedFileOutput, S3Upload, EgressStatus } from 'livekit-server-sdk'
import { prisma } from './db'

const apiKey = process.env.LIVEKIT_API_KEY ?? ''
const apiSecret = process.env.LIVEKIT_API_SECRET ?? ''
const livekitUrl = process.env.LIVEKIT_URL ?? 'http://localhost:7880'

export const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret)
export const egressClient = new EgressClient(livekitUrl, apiKey, apiSecret)
export const webhookReceiver = new WebhookReceiver(apiKey, apiSecret)

export function roomNameForStation(stationId: string) {
  return `station-${stationId}`
}

export async function mintToken({
  identity,
  name,
  room,
  canPublish,
}: {
  identity: string
  name: string
  room: string
  canPublish: boolean
}) {
  const token = new AccessToken(apiKey, apiSecret, { identity, name, ttl: '6h' })
  token.addGrant({
    room,
    roomJoin: true,
    canPublish,
    canPublishData: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  })
  return token.toJwt()
}

// LiveKit Cloud's Egress service has no local disk to write to — it always
// needs an S3-compatible bucket destination. Self-hosted egress (via
// docker-compose.yml) can write straight to a mounted /out volume instead.
// Recording is treated as an optional add-on: if no bucket is configured,
// callers should skip starting egress rather than fail broadcasting itself.
export function recordingStorageConfigured() {
  return Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY)
}

export async function startStationEgress(roomName: string, stationSlug: string) {
  const filepath = `${stationSlug}-${Date.now()}.mp4`

  const file = recordingStorageConfigured()
    ? new EncodedFileOutput({
        filepath,
        fileType: EncodedFileType.MP4,
        output: {
          case: 's3',
          value: new S3Upload({
            accessKey: process.env.S3_ACCESS_KEY,
            secret: process.env.S3_SECRET_KEY,
            bucket: process.env.S3_BUCKET,
            region: process.env.S3_REGION || 'auto',
            endpoint: process.env.S3_ENDPOINT,
            forcePathStyle: true,
          }),
        },
      })
    : new EncodedFileOutput({ filepath: `/out/${filepath}`, fileType: EncodedFileType.MP4 })

  return egressClient.startRoomCompositeEgress(roomName, { file }, { audioOnly: true })
}

const TERMINAL_EGRESS_STATUSES = new Set([
  EgressStatus.EGRESS_COMPLETE,
  EgressStatus.EGRESS_FAILED,
  EgressStatus.EGRESS_ABORTED,
  EgressStatus.EGRESS_LIMIT_REACHED,
])

// LiveKit's egress_ended webhook can't reach a machine with no public URL
// (true for local dev, and for anyone who hasn't wired up webhooks yet), so
// this polls LiveKit's own API directly instead — same information, no
// public reachability required. Fire-and-forget from broadcast/stop; safe to
// call repeatedly since it's idempotent (only writes once terminal).
export async function pollEgressCompletion(egressId: string, recordingId: string) {
  const maxAttempts = 60 // ~5 minutes at 5s interval — encoding/upload can take a while
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    try {
      const [info] = await egressClient.listEgress({ egressId })
      if (!info || !TERMINAL_EGRESS_STATUSES.has(info.status)) continue

      const fileResult = info.fileResults?.[0]
      await prisma.recording.update({
        where: { id: recordingId },
        data: {
          status: info.status === EgressStatus.EGRESS_COMPLETE && fileResult ? 'READY' : 'FAILED',
          fileUrl: fileResult?.filename ?? null,
          durationSeconds: fileResult?.duration ? Math.round(Number(fileResult.duration) / 1_000_000_000) : null,
        },
      })
      return
    } catch (err) {
      console.error('Egress status poll failed', err)
    }
  }
  console.error(`Egress ${egressId} did not reach a terminal state within the poll window`)
}
