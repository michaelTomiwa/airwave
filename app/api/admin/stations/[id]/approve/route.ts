import { prisma } from '@/lib/db'
import { requireRole, jsonError, jsonOk } from '@/lib/api-guard'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireRole(['ADMIN'])
  if (error) return error

  const station = await prisma.station.findUnique({ where: { id: params.id } })
  if (!station) return jsonError('Station not found.', 404)

  const updated = await prisma.station.update({ where: { id: params.id }, data: { approvalStatus: 'APPROVED' } })

  await prisma.notification.create({
    data: {
      userId: station.ownerId,
      type: 'STATION_APPROVED',
      title: 'Station approved',
      body: `${station.name} has been approved and can now go live.`,
      linkUrl: '/studio',
    },
  })
  await prisma.activity.create({
    data: { title: `${station.name} approved`, detail: `An admin approved ${station.name}.`, tone: 'GOOD' },
  })

  return jsonOk(updated)
}
