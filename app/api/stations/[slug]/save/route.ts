import { prisma } from '@/lib/db'
import { requireSession, jsonError, jsonOk } from '@/lib/api-guard'

export async function POST(_request: Request, { params }: { params: { slug: string } }) {
  const { session, error } = await requireSession()
  if (error) return error

  const station = await prisma.station.findUnique({ where: { slug: params.slug } })
  if (!station) return jsonError('Station not found.', 404)

  const existing = await prisma.savedStation.findUnique({
    where: { userId_stationId: { userId: session.user.id, stationId: station.id } },
  })

  if (existing) {
    await prisma.savedStation.delete({ where: { id: existing.id } })
    return jsonOk({ saved: false })
  }

  await prisma.savedStation.create({ data: { userId: session.user.id, stationId: station.id } })
  return jsonOk({ saved: true })
}
