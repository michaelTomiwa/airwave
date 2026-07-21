import { prisma } from '@/lib/db'
import { requireSession, jsonError, jsonOk } from '@/lib/api-guard'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession()
  if (error) return error

  const message = await prisma.chatMessage.findUnique({ where: { id: params.id } })
  if (!message) return jsonError('Message not found.', 404)

  const [updated] = await prisma.$transaction([
    prisma.chatMessage.update({ where: { id: params.id }, data: { flagged: true } }),
    prisma.report.create({
      data: {
        targetType: 'MESSAGE',
        stationId: message.stationId,
        messageId: message.id,
        reporterId: session.user.id,
        reason: 'Flagged from live chat',
        status: 'OPEN',
      },
    }),
  ])

  return jsonOk(updated)
}
