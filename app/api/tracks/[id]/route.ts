import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { jsonError, jsonOk } from '@/lib/api-guard'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BROADCASTER') return jsonError('You do not have access to do this.', 403)

  const track = await prisma.track.findUnique({ where: { id: params.id }, include: { station: true } })
  if (!track || track.station.ownerId !== session.user.id) return jsonError('Track not found.', 404)

  await prisma.track.delete({ where: { id: params.id } })
  return jsonOk({ deleted: true })
}
