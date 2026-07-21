import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { jsonError, jsonOk } from '@/lib/api-guard'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  const message = await prisma.chatMessage.findUnique({ where: { id: params.id }, include: { station: true } })
  if (!message) return jsonError('Message not found.', 404)

  const canModerate = session.user.role === 'ADMIN' || message.station.ownerId === session.user.id
  if (!canModerate) return jsonError('You do not have access to do this.', 403)

  await prisma.chatMessage.update({ where: { id: params.id }, data: { removed: true } })
  return jsonOk({ removed: true })
}
