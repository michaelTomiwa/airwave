import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, jsonOk } from '@/lib/api-guard'

export async function GET(request: NextRequest) {
  const { error } = await requireRole(['ADMIN'])
  if (error) return error

  const status = new URL(request.url).searchParams.get('status')

  const reports = await prisma.report.findMany({
    where: status ? { status: status.toUpperCase() } : {},
    include: { station: { select: { name: true, slug: true } }, reporter: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return jsonOk(reports)
}
