import { prisma } from '@/lib/db'
import { jsonOk } from '@/lib/api-guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  return jsonOk(plans)
}
