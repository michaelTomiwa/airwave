import { prisma } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/api-guard'

// Listener heartbeat: called by StationPlayer right after it successfully
// connects to the LiveKit room. This is the source of truth for listener
// counts — not the LiveKit webhook — because local/dev deployments have no
// public URL for LiveKit Cloud to send webhooks to. Works identically in
// production too, so there's no behavior difference to maintain.
export async function POST(_request: Request, { params }: { params: { slug: string } }) {
  const station = await prisma.station.findUnique({ where: { slug: params.slug }, select: { id: true } })
  if (!station) return jsonError('Station not found.', 404)

  const liveSession = await prisma.liveSession.findFirst({ where: { stationId: station.id, status: 'LIVE' } })
  if (!liveSession) return jsonOk({ tracked: false })

  const updated = await prisma.liveSession.update({
    where: { id: liveSession.id },
    data: { currentListeners: { increment: 1 } },
  })
  if (updated.currentListeners > updated.peakListeners) {
    await prisma.liveSession.update({ where: { id: liveSession.id }, data: { peakListeners: updated.currentListeners } })
  }

  return jsonOk({ tracked: true, liveSessionId: liveSession.id })
}
