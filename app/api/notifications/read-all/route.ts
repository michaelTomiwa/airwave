import { prisma } from '@/lib/db'
import { requireSession, jsonOk } from '@/lib/api-guard'

export async function PATCH() {
  const { session, error } = await requireSession()
  if (error) return error

  await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } })
  return jsonOk({ ok: true })
}
