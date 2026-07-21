import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireRole(['ADMIN'])
  if (error) return error

  const report = await prisma.report.findUnique({ where: { id: params.id } })
  if (!report) return jsonError('Report not found.', 404)

  const updated = await prisma.report.update({ where: { id: params.id }, data: { status: 'RESOLVED', resolvedAt: new Date() } })
  return jsonOk(updated)
}
