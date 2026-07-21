import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/api-guard'
import { uniqueStationSlug } from '@/lib/slug'

const baseSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/i, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(6).max(72),
  phone: z.string().optional(),
  country: z.string().default('Nigeria'),
})

const listenerSchema = baseSchema.extend({ role: z.literal('LISTENER') })

const broadcasterSchema = baseSchema.extend({
  role: z.literal('BROADCASTER'),
  stationName: z.string().min(2).max(80),
  category: z.string().min(2),
  description: z.string().min(10).max(600),
  language: z.string().default('English'),
})

const signupSchema = z.discriminatedUnion('role', [listenerSchema, broadcasterSchema])

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid signup details.')
  }

  const data = parsed.data
  const email = data.email.toLowerCase().trim()
  const username = data.username.toLowerCase().trim()

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  })
  if (existing) {
    return jsonError(existing.email === email ? 'An account with this email already exists.' : 'That username is taken.')
  }

  const passwordHash = await bcrypt.hash(data.password, 10)

  if (data.role === 'LISTENER') {
    await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        name: data.name,
        phone: data.phone,
        country: data.country,
        role: 'LISTENER',
      },
    })
    return jsonOk({ role: 'LISTENER' })
  }

  const starterPlan = await prisma.plan.findUnique({ where: { code: 'STARTER' } })
  if (!starterPlan) return jsonError('Signup is temporarily unavailable. Please try again shortly.', 503)

  const slug = await uniqueStationSlug(data.stationName)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        username,
        passwordHash,
        name: data.name,
        phone: data.phone,
        country: data.country,
        role: 'BROADCASTER',
      },
    })
    const station = await tx.station.create({
      data: {
        ownerId: user.id,
        slug,
        name: data.stationName,
        category: data.category,
        description: data.description,
        country: data.country,
        language: data.language,
        approvalStatus: 'PENDING',
      },
    })
    await tx.broadcasterSubscription.create({
      data: {
        stationId: station.id,
        planId: starterPlan.id,
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 100 * 365 * 86400000),
      },
    })
    await tx.activity.create({
      data: {
        title: 'New station submitted',
        detail: `${data.stationName} was submitted by ${data.name} and is awaiting admin approval.`,
        tone: 'NEUTRAL',
      },
    })
  })

  return jsonOk({ role: 'BROADCASTER' })
}
