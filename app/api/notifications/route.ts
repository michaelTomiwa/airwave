import { prisma } from '@/lib/db'
import { requireSession, jsonOk } from '@/lib/api-guard'

export async function GET() {
  const { session, error } = await requireSession()
  if (error) return error

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })
  const unreadCount = await prisma.notification.count({ where: { userId: session.user.id, read: false } })

  return jsonOk({ notifications, unreadCount })
}
