import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000)
}

const planSeeds = [
  { code: 'STARTER', name: 'Starter', priceKobo: 0, listenerCap: 50, maxGuests: 1, recordingEnabled: false, customBranding: false, analytics: false, sortOrder: 0 },
  { code: 'BASIC', name: 'Basic', priceKobo: 250000, listenerCap: 300, maxGuests: 2, recordingEnabled: true, customBranding: false, analytics: false, sortOrder: 1 },
  { code: 'PRO', name: 'Pro', priceKobo: 750000, listenerCap: 1000, maxGuests: 5, recordingEnabled: true, customBranding: true, analytics: false, sortOrder: 2 },
  { code: 'PREMIUM', name: 'Premium', priceKobo: 1500000, listenerCap: 5000, maxGuests: 5, recordingEnabled: true, customBranding: true, analytics: true, sortOrder: 3 },
  { code: 'ELITE', name: 'Elite', priceKobo: 3000000, listenerCap: null, maxGuests: 5, recordingEnabled: true, customBranding: true, analytics: true, sortOrder: 4 },
]

async function main() {
  console.log('Seeding plans...')
  const plans: Record<string, { id: string }> = {}
  for (const plan of planSeeds) {
    const created = await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    })
    plans[plan.code] = created
  }

  console.log('Seeding demo users...')
  const passwordHash = await bcrypt.hash('demo123', 10)

  const listener = await prisma.user.upsert({
    where: { email: 'listener@airwave.fm' },
    update: {},
    create: {
      email: 'listener@airwave.fm',
      passwordHash,
      name: 'Ada Rivers',
      username: 'adarivers',
      phone: '+234 801 555 1111',
      role: 'LISTENER',
    },
  })

  const broadcaster1 = await prisma.user.upsert({
    where: { email: 'broadcaster@airwave.fm' },
    update: {},
    create: {
      email: 'broadcaster@airwave.fm',
      passwordHash,
      name: 'DJ Nova',
      username: 'djnova',
      phone: '+234 803 000 4444',
      role: 'BROADCASTER',
    },
  })

  const broadcaster2 = await prisma.user.upsert({
    where: { email: 'host@sunrisefm.ng' },
    update: {},
    create: {
      email: 'host@sunrisefm.ng',
      passwordHash,
      name: 'Kola Beats',
      username: 'kolabeats',
      phone: '+234 802 111 3333',
      role: 'BROADCASTER',
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin@airwave.fm' },
    update: {},
    create: {
      email: 'admin@airwave.fm',
      passwordHash,
      name: 'Zina Okafor',
      username: 'zinaadmin',
      phone: '+234 805 555 8888',
      role: 'ADMIN',
    },
  })

  console.log('Seeding stations...')
  const station1 = await prisma.station.upsert({
    where: { ownerId: broadcaster1.id },
    update: {},
    create: {
      ownerId: broadcaster1.id,
      slug: 'urban-vibes',
      name: 'Urban Vibes',
      category: 'Electronic',
      description: 'Late night dance, smooth transitions, and listener-driven requests.',
      country: 'Nigeria',
      language: 'English',
      approvalStatus: 'APPROVED',
      isLive: false,
      featured: true,
      verified: true,
      nowPlayingTitle: 'Midnight City Lights',
      walletBalanceKobo: 16200000,
      pendingPayoutKobo: 3200000,
      totalWithdrawnKobo: 52000000,
      followerCount: 4870,
    },
  })

  const station2 = await prisma.station.upsert({
    where: { ownerId: broadcaster2.id },
    update: {},
    create: {
      ownerId: broadcaster2.id,
      slug: 'sunrise-radio',
      name: 'Sunrise Radio',
      category: 'Talk',
      description: 'Morning culture, local business updates, and live call-ins.',
      country: 'Nigeria',
      language: 'English',
      approvalStatus: 'PENDING',
      isLive: false,
      followerCount: 740,
      walletBalanceKobo: 4800000,
      pendingPayoutKobo: 1200000,
      totalWithdrawnKobo: 9000000,
    },
  })

  await prisma.broadcasterSubscription.upsert({
    where: { stationId: station1.id },
    update: {},
    create: { stationId: station1.id, planId: plans.PRO.id, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
  })
  await prisma.broadcasterSubscription.upsert({
    where: { stationId: station2.id },
    update: {},
    create: { stationId: station2.id, planId: plans.BASIC.id, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
  })

  console.log('Seeding tracks, chat, recordings, payments, reports, activity...')
  await prisma.track.createMany({
    data: [
      { stationId: station1.id, title: 'Midnight City Lights', artist: 'DJ Nova', durationSeconds: 227 },
      { stationId: station1.id, title: 'Night Drive', artist: 'Sonic Flow', durationSeconds: 251 },
      { stationId: station1.id, title: 'Skyline Pulse', artist: 'Aura Lane', durationSeconds: 209 },
      { stationId: station2.id, title: 'Morning Business Roundup', artist: 'Sunrise Team', durationSeconds: 730 },
    ],
  })

  const pastSession = await prisma.liveSession.create({
    data: {
      stationId: station1.id,
      livekitRoomName: `station-${station1.id}-seed-${Date.now()}`,
      status: 'ENDED',
      currentListeners: 0,
      peakListeners: 1560,
      startedAt: minutesAgo(600),
      endedAt: minutesAgo(510),
    },
  })

  await prisma.recording.create({
    data: {
      stationId: station1.id,
      liveSessionId: pastSession.id,
      title: 'Urban Vibes Night Session',
      durationSeconds: 5234,
      status: 'READY',
      peakListeners: 1560,
      airedAt: minutesAgo(600),
    },
  })

  await prisma.chatMessage.createMany({
    data: [
      { stationId: station1.id, userId: listener.id, userName: 'Ada Rivers', text: 'This set is clean tonight.', createdAt: minutesAgo(18) },
      { stationId: station1.id, userId: broadcaster1.id, userName: 'Mide', text: 'Can we get more amapiano after this?', createdAt: minutesAgo(14) },
      { stationId: station1.id, userId: listener.id, userName: 'Guest_47', text: 'Spam message removed soon', flagged: true, createdAt: minutesAgo(9) },
    ],
  })

  await prisma.follow.upsert({
    where: { userId_stationId: { userId: listener.id, stationId: station1.id } },
    update: {},
    create: { userId: listener.id, stationId: station1.id },
  })
  await prisma.savedStation.upsert({
    where: { userId_stationId: { userId: listener.id, stationId: station1.id } },
    update: {},
    create: { userId: listener.id, stationId: station1.id },
  })

  await prisma.payment.upsert({
    where: { paystackReference: 'seed-tip-1' },
    update: {},
    create: {
      purpose: 'TIP',
      userId: listener.id,
      stationId: station1.id,
      amountKobo: 500000,
      status: 'SUCCESS',
      paystackReference: 'seed-tip-1',
      createdAt: minutesAgo(22),
    },
  })

  await prisma.payout.create({
    data: {
      stationId: station1.id,
      amountKobo: 3000000,
      status: 'PENDING',
      bankName: 'GTBank',
      accountNumber: '0123456789',
      accountName: 'DJ Nova',
      requestedAt: minutesAgo(95),
    },
  })

  await prisma.report.create({
    data: {
      targetType: 'STATION',
      stationId: station2.id,
      reporterId: listener.id,
      reason: 'Station pending approval review',
      status: 'OPEN',
      createdAt: minutesAgo(180),
    },
  })

  await prisma.activity.createMany({
    data: [
      { title: 'Urban Vibes tipped', detail: 'Ada Rivers sent NGN 5,000 to Urban Vibes.', tone: 'GOOD', createdAt: minutesAgo(22) },
      { title: 'Payout waiting', detail: 'DJ Nova has one payout waiting for admin approval.', tone: 'WARNING', createdAt: minutesAgo(95) },
      { title: 'Sunrise Radio pending', detail: 'Station profile still needs admin approval before going live.', tone: 'NEUTRAL', createdAt: minutesAgo(180) },
    ],
  })

  console.log('Seed complete.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
