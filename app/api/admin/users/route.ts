import { prisma } from '@/lib/db'
import { requireRole, jsonOk } from '@/lib/api-guard'

export async function GET() {
  const { error } = await requireRole(['ADMIN'])
  if (error) return error

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      country: true,
      createdAt: true,
      station: { select: { name: true, slug: true, approvalStatus: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return jsonOk(users)
}
