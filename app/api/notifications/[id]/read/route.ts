import { prisma } from '@/lib/db'
import { requireSession, jsonError, jsonOk } from '@/lib/api-guard'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession()
  if (error) return error

  const notification = await prisma.notification.findUnique({ where: { id: params.id } })
  if (!notification || notification.userId !== session.user.id) return jsonError('Notification not found.', 404)

  const updated = await prisma.notification.update({ where: { id: params.id }, data: { read: true } })
  return jsonOk(updated)
}
