import { prisma } from './db'

export async function getStationEntitlements(stationId: string) {
  const subscription = await prisma.broadcasterSubscription.findUnique({
    where: { stationId },
    include: { plan: true },
  })

  if (!subscription || subscription.status !== 'ACTIVE' || subscription.currentPeriodEnd < new Date()) {
    const starter = await prisma.plan.findUnique({ where: { code: 'STARTER' } })
    return { plan: starter, active: false }
  }

  return { plan: subscription.plan, active: true }
}
