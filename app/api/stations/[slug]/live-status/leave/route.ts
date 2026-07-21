import { z } from 'zod'
import { prisma } from '@/lib/db'
import { jsonOk } from '@/lib/api-guard'

const schema = z.object({ liveSessionId: z.string().optional() })

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const station = await prisma.station.findUnique({ where: { slug: params.slug }, select: { id: true } })
  if (!station) return jsonOk({ tracked: false })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  const liveSessionId = parsed.success ? parsed.data.liveSessionId : undefined

  const liveSession = liveSessionId
    ? await prisma.liveSession.findUnique({ where: { id: liveSessionId } })
    : await prisma.liveSession.findFirst({ where: { stationId: station.id, status: 'LIVE' } })

  if (!liveSession || liveSession.currentListeners <= 0) return jsonOk({ tracked: false })

  await prisma.liveSession.update({
    where: { id: liveSession.id },
    data: { currentListeners: { decrement: 1 } },
  })

  return jsonOk({ tracked: true })
}
