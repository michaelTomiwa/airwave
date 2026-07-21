import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { jsonError, jsonOk } from '@/lib/api-guard'

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const station = await prisma.station.findUnique({ where: { slug: params.slug }, select: { id: true } })
  if (!station) return jsonError('Station not found.', 404)

  const { searchParams } = new URL(request.url)
  const liveSessionId = searchParams.get('liveSessionId')

  const messages = await prisma.chatMessage.findMany({
    where: {
      stationId: station.id,
      removed: false,
      ...(liveSessionId ? { liveSessionId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return jsonOk(messages.reverse())
}

const messageSchema = z.object({
  text: z.string().min(1).max(500),
  liveSessionId: z.string().optional().nullable(),
})

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in to chat.', 401)

  const station = await prisma.station.findUnique({ where: { slug: params.slug } })
  if (!station) return jsonError('Station not found.', 404)

  const body = await request.json().catch(() => null)
  const parsed = messageSchema.safeParse(body)
  if (!parsed.success) return jsonError('Message is invalid.')

  const message = await prisma.chatMessage.create({
    data: {
      stationId: station.id,
      liveSessionId: parsed.data.liveSessionId ?? undefined,
      userId: session.user.id,
      userName: session.user.name ?? 'Listener',
      text: parsed.data.text,
    },
  })

  return jsonOk(message, 201)
}
