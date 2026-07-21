import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { jsonOk } from '@/lib/api-guard'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const liveOnly = searchParams.get('live') === 'true'
  const search = searchParams.get('search')?.trim()
  const sort = searchParams.get('sort') ?? 'trending'
  const limit = Math.min(Number(searchParams.get('limit') ?? 60) || 60, 100)

  const stations = await prisma.station.findMany({
    where: {
      approvalStatus: 'APPROVED',
      ...(liveOnly ? { isLive: true } : {}),
      ...(category && category !== 'All' ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
              { category: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      owner: { select: { name: true } },
      liveSessions: {
        where: { status: 'LIVE' },
        select: { currentListeners: true },
        take: 1,
      },
    },
    orderBy:
      sort === 'new'
        ? { createdAt: 'desc' }
        : [{ isLive: 'desc' }, { featured: 'desc' }, { followerCount: 'desc' }],
    take: limit,
  })

  return jsonOk(
    stations.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      category: s.category,
      description: s.description,
      country: s.country,
      language: s.language,
      coverImageUrl: s.coverImageUrl,
      isLive: s.isLive,
      featured: s.featured,
      verified: s.verified,
      followerCount: s.followerCount,
      nowPlayingTitle: s.nowPlayingTitle,
      hostName: s.owner.name,
      currentListeners: s.liveSessions[0]?.currentListeners ?? 0,
    })),
  )
}
