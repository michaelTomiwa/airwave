import { prisma } from '@/lib/db'

// Idempotent: safe to call multiple times for the same payment (webhook +
// client-side verify fallback can both fire for one transaction).
export async function applySuccessfulPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.status === 'SUCCESS') return

  await prisma.payment.update({ where: { id: paymentId }, data: { status: 'SUCCESS' } })

  if (payment.purpose === 'TIP' && payment.stationId) {
    const station = await prisma.station.update({
      where: { id: payment.stationId },
      data: { walletBalanceKobo: { increment: payment.amountKobo }, pendingPayoutKobo: { increment: payment.amountKobo } },
    })
    const tipper = await prisma.user.findUnique({ where: { id: payment.userId }, select: { name: true } })
    await prisma.notification.create({
      data: {
        userId: station.ownerId,
        type: 'TIP_RECEIVED',
        title: 'You received a tip',
        body: `${tipper?.name ?? 'A listener'} tipped ${station.name} ${(payment.amountKobo / 100).toLocaleString('en-NG')} NGN.`,
        linkUrl: '/dashboard',
      },
    })
    await prisma.activity.create({
      data: {
        title: `${station.name} tipped`,
        detail: `${tipper?.name ?? 'A listener'} sent NGN ${(payment.amountKobo / 100).toLocaleString('en-NG')} to ${station.name}.`,
        tone: 'GOOD',
      },
    })
  }

  if (payment.purpose === 'BROADCASTER_SUBSCRIPTION' && payment.stationId) {
    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {}
    const planId = metadata.planId as string | undefined
    if (planId) {
      await prisma.broadcasterSubscription.upsert({
        where: { stationId: payment.stationId },
        update: { planId, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
        create: { stationId: payment.stationId, planId, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
      })
      const station = await prisma.station.findUnique({ where: { id: payment.stationId } })
      if (station) {
        await prisma.notification.create({
          data: {
            userId: station.ownerId,
            type: 'SYSTEM',
            title: 'Plan upgraded',
            body: `Your broadcaster subscription is now active for the next 30 days.`,
            linkUrl: '/studio',
          },
        })
      }
    }
  }

  if (payment.purpose === 'LISTENER_SUPPORT' && payment.stationId) {
    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {}
    const tier = (metadata.tier as string | undefined) ?? 'FAN'
    await prisma.stationSupport.upsert({
      where: { listenerId_stationId: { listenerId: payment.userId, stationId: payment.stationId } },
      update: { tier, priceKobo: payment.amountKobo, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
      create: {
        listenerId: payment.userId,
        stationId: payment.stationId,
        tier,
        priceKobo: payment.amountKobo,
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    })
    const [station, supporter] = await Promise.all([
      prisma.station.findUnique({ where: { id: payment.stationId } }),
      prisma.user.findUnique({ where: { id: payment.userId }, select: { name: true } }),
    ])
    if (station) {
      await prisma.notification.create({
        data: {
          userId: station.ownerId,
          type: 'SUPPORT_RECEIVED',
          title: 'New supporter',
          body: `${supporter?.name ?? 'A listener'} became a ${tier.toLowerCase()} supporter of ${station.name}.`,
          linkUrl: '/dashboard',
        },
      })
    }
  }
}
