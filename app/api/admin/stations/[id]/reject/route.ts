import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireRole(['ADMIN'])
  if (error) return error

  const station = await prisma.station.findUnique({ where: { id: params.id } })
  if (!station) return jsonError('Station not found.', 404)

  const updated = await prisma.station.update({ where: { id: params.id }, data: { approvalStatus: 'REJECTED' } })

  await prisma.notification.create({
    data: {
      userId: station.ownerId,
      type: 'STATION_REJECTED',
      title: 'Station rejected',
      body: `${station.name} was not approved. Update your details and contact support to reapply.`,
      linkUrl: '/studio',
    },
  })

  return jsonOk(updated)
}
