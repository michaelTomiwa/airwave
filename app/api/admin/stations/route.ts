import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, jsonOk } from '@/lib/api-guard'

export async function GET(request: NextRequest) {
  const { error } = await requireRole(['ADMIN'])
  if (error) return error

  const status = new URL(request.url).searchParams.get('status')

  const stations = await prisma.station.findMany({
    where: status ? { approvalStatus: status.toUpperCase() } : {},
    include: { owner: { select: { name: true, email: true } }, subscription: { include: { plan: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return jsonOk(stations)
}
